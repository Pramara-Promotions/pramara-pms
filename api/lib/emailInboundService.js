// api/lib/emailInboundService.js
// Phase 5: Inbound Email Processing
// IMAP integration, classification, and entity creation

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { PrismaClient } = require('@prisma/client');
const { decrypt } = require('./secrets');
const { s3Service } = require('./storage');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

class EmailInboundService {
  constructor() {
    this.imap = null;
    this.isConnected = false;
    this.isPolling = false;
    this.pollingInterval = null;
    
    // Classification keywords (simple rules, can be enhanced with AI later)
    this.classificationRules = {
      invoice: ['invoice', 'bill', 'payment', 'due'],
      po: ['purchase order', 'po number', 'po#', 'order confirmation'],
      spec: ['specification', 'specs', 'requirements', 'technical'],
      artwork: ['artwork', 'design', 'proof', 'pantone', 'color'],
      quote: ['quotation', 'quote', 'pricing', 'estimate'],
      shipment: ['shipping', 'delivery', 'dispatch', 'tracking'],
      qc: ['quality', 'inspection', 'qc', 'defect', 'failure']
    };
  }

  /**
   * Initialize IMAP connection
   */
  async connect() {
    try {
      // Check if inbound email is enabled
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'emailInboundEnabled' }
      });

      if (!setting || setting.value === false) {
        console.log('📧 [Inbound Email] Inbound email is disabled');
        return false;
      }

      // Prefer UI-configured EmailAccount over environment variables
      let account = await prisma.emailAccount.findFirst({
        where: { enabled: true, protocol: 'imap' },
        orderBy: { updatedAt: 'desc' }
      });

      let config;
      if (account) {
        const password = decrypt(account.passwordEnc);
        config = {
          user: account.username,
          password,
          host: account.host || process.env.IMAP_HOST || 'outlook.office365.com',
          port: account.port || parseInt(process.env.IMAP_PORT || '993'),
          tls: typeof account.tls === 'boolean' ? account.tls : process.env.IMAP_TLS !== 'false',
          tlsOptions: { rejectUnauthorized: false }
        };
      } else {
        // Fallback to environment
        config = {
          user: process.env.IMAP_USER,
          password: process.env.IMAP_PASSWORD,
          host: process.env.IMAP_HOST || 'imap.gmail.com',
          port: parseInt(process.env.IMAP_PORT || '993'),
          tls: process.env.IMAP_TLS !== 'false',
          tlsOptions: { rejectUnauthorized: false }
        };
      }

      if (!config.user || !config.password) {
        console.log('⚠️  [Inbound Email] IMAP credentials not configured (no EmailAccount found and no env creds)');
        return false;
      }

      this.imap = new Imap(config);

      return new Promise((resolve, reject) => {
        this.imap.once('ready', async () => {
          console.log('✅ [Inbound Email] IMAP connection established');
          this.isConnected = true;
          // Best-effort status update on the account
          try {
            if (account) {
              await prisma.emailAccount.update({
                where: { id: account.id },
                data: { status: 'connected', lastSyncAt: new Date() }
              });
            }
          } catch {}
          resolve(true);
        });

        this.imap.once('error', (err) => {
          console.error('❌ [Inbound Email] IMAP connection error:', err);
          this.isConnected = false;
          // Mark account error if present
          try {
            if (account) {
              const msg = (err && err.source) ? `error:${err.source}` : `error:${err?.message || 'unknown'}`;
              prisma.emailAccount.update({ where: { id: account.id }, data: { status: msg } }).catch(()=>{});
            }
          } catch {}
          reject(err);
        });

        this.imap.once('end', () => {
          console.log('🔌 [Inbound Email] IMAP connection ended');
          this.isConnected = false;
        });

        this.imap.connect();
      });
    } catch (error) {
      console.error('❌ [Inbound Email] Error connecting to IMAP:', error);
      return false;
    }
  }

  /**
   * Disconnect IMAP
   */
  disconnect() {
    if (this.imap && this.isConnected) {
      this.imap.end();
    }
  }

  /**
   * Start polling for new emails
   * @param {number} intervalMinutes - Polling interval in minutes (default: 5)
   */
  async startPolling(intervalMinutes = 5) {
    if (this.isPolling) {
      console.log('⚠️  [Inbound Email] Polling already active');
      return;
    }

    const connected = await this.connect();
    if (!connected) {
      console.log('⚠️  [Inbound Email] Cannot start polling - connection failed');
      return;
    }

    this.isPolling = true;
    console.log(`✅ [Inbound Email] Started polling every ${intervalMinutes} minutes`);

    // Initial fetch
    await this.fetchNewEmails();

    // Set up interval
    this.pollingInterval = setInterval(async () => {
      await this.fetchNewEmails();
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop polling
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    this.disconnect();
    console.log('🛑 [Inbound Email] Stopped polling');
  }

  /**
   * Fetch new emails from INBOX
   */
  async fetchNewEmails() {
    if (!this.isConnected) {
      console.log('⚠️  [Inbound Email] Not connected, skipping fetch');
      return;
    }

    return new Promise((resolve, reject) => {
      this.imap.openBox('INBOX', false, async (err, box) => {
        if (err) {
          console.error('❌ [Inbound Email] Error opening inbox:', err);
          return reject(err);
        }

        // Search for unseen emails
        this.imap.search(['UNSEEN'], async (err, results) => {
          if (err) {
            console.error('❌ [Inbound Email] Error searching emails:', err);
            return reject(err);
          }

          if (!results || results.length === 0) {
            console.log('📭 [Inbound Email] No new emails');
            return resolve(0);
          }

          console.log(`📬 [Inbound Email] Found ${results.length} new emails`);

          const fetch = this.imap.fetch(results, { bodies: '', markSeen: true });
          let processed = 0;

          fetch.on('message', (msg) => {
            msg.on('body', async (stream) => {
              try {
                const parsed = await simpleParser(stream);
                await this.processEmail(parsed);
                processed++;
              } catch (error) {
                console.error('❌ [Inbound Email] Error processing email:', error);
              }
            });
          });

          fetch.once('error', (err) => {
            console.error('❌ [Inbound Email] Fetch error:', err);
            reject(err);
          });

          fetch.once('end', () => {
            console.log(`✅ [Inbound Email] Processed ${processed} emails`);
            resolve(processed);
          });
        });
      });
    });
  }

  /**
   * Process a single email
   * @param {Object} parsed - Parsed email from mailparser
   */
  async processEmail(parsed) {
    try {
      // Check if email already exists
      const messageId = parsed.messageId;
      const existing = await prisma.inboundEmail.findUnique({
        where: { messageId }
      });

      if (existing) {
        console.log(`⚠️  [Inbound Email] Email already exists: ${messageId}`);
        return existing;
      }

      // Process attachments
      const attachments = [];
      if (parsed.attachments && parsed.attachments.length > 0) {
        for (const attachment of parsed.attachments) {
          const attachmentData = await this._saveAttachment(attachment);
          if (attachmentData) {
            attachments.push(attachmentData);
          }
        }
      }

      // Classify email
      const classification = this._classifyEmail(parsed);

      // Create inbound email record
      const inboundEmail = await prisma.inboundEmail.create({
        data: {
          messageId,
          from: parsed.from?.text || '',
          to: parsed.to ? (Array.isArray(parsed.to) ? parsed.to.map(t => t.text) : [parsed.to.text]) : [],
          cc: parsed.cc ? (Array.isArray(parsed.cc) ? parsed.cc.map(t => t.text) : [parsed.cc.text]) : [],
          subject: parsed.subject || '(No Subject)',
          textBody: parsed.text || null,
          htmlBody: parsed.html || null,
          hasAttachments: attachments.length > 0,
          attachmentCount: attachments.length,
          attachments: attachments.length > 0 ? attachments : null,
          classified: classification.confidence > 0.6,
          classification: classification.type,
          confidence: classification.confidence,
          receivedAt: parsed.date || new Date(),
          rawHeaders: parsed.headers ? Object.fromEntries(parsed.headers) : null,
          inReplyTo: parsed.inReplyTo || null,
          references: parsed.references || []
        }
      });

      console.log(`✅ [Inbound Email] Saved email: ${inboundEmail.subject} (${classification.type})`);

      // Auto-link if confidence is high
      if (classification.confidence > 0.8 && classification.entityType) {
        await this._autoLink(inboundEmail, classification);
      }

      // Create notification for relevant users
      await this._notifyNewEmail(inboundEmail, classification);

      return inboundEmail;
    } catch (error) {
      console.error('❌ [Inbound Email] Error processing email:', error);
      throw error;
    }
  }

  /**
   * Save email attachment to S3
   */
  async _saveAttachment(attachment) {
    try {
      const filename = attachment.filename || `attachment-${uuidv4()}`;
      const key = `inbound-emails/${new Date().toISOString().split('T')[0]}/${uuidv4()}-${filename}`;
      
      // Upload to S3/MinIO
      await s3Service.uploadBuffer(attachment.content, key, attachment.contentType);

      return {
        filename,
        size: attachment.size,
        mimeType: attachment.contentType,
        key
      };
    } catch (error) {
      console.error('❌ [Inbound Email] Error saving attachment:', error);
      return null;
    }
  }

  /**
   * Classify email using simple keyword matching
   * Can be enhanced with AI/ML later
   */
  _classifyEmail(parsed) {
    const text = `${parsed.subject || ''} ${parsed.text || ''}`.toLowerCase();
    
    let bestMatch = { type: 'general', confidence: 0, entityType: null };

    for (const [type, keywords] of Object.entries(this.classificationRules)) {
      const matches = keywords.filter(keyword => text.includes(keyword));
      const confidence = matches.length / keywords.length;

      if (confidence > bestMatch.confidence) {
        bestMatch = {
          type,
          confidence: Math.min(confidence * 1.5, 1.0), // Boost but cap at 1.0
          entityType: this._getEntityTypeForClassification(type)
        };
      }
    }

    return bestMatch;
  }

  /**
   * Get entity type for classification
   */
  _getEntityTypeForClassification(classification) {
    const mapping = {
      invoice: 'document',
      po: 'project',
      spec: 'document',
      artwork: 'document',
      quote: 'project',
      shipment: 'project',
      qc: 'batch'
    };
    return mapping[classification] || null;
  }

  /**
   * Auto-link email to entity if confidence is high
   */
  async _autoLink(inboundEmail, classification) {
    try {
      // Extract entity code from subject/body
      const text = `${inboundEmail.subject} ${inboundEmail.textBody || ''}`;
      
      // Look for PO numbers, project codes, batch codes
      const patterns = {
        project: /PO[-\s]?(\d{4}-\d{3,4})/i,
        batch: /BATCH[-\s]?#?([A-Z0-9-]+)/i
      };

      const pattern = patterns[classification.entityType];
      if (!pattern) return;

      const match = text.match(pattern);
      if (!match) return;

      const code = match[1];

      // Find entity
      let entityId = null;
      if (classification.entityType === 'project') {
        const project = await prisma.project.findFirst({
          where: { poNumber: { contains: code, mode: 'insensitive' } }
        });
        entityId = project?.id;
      }

      if (entityId) {
        await prisma.inboundEmail.update({
          where: { id: inboundEmail.id },
          data: {
            linkedEntity: classification.entityType,
            linkedEntityId: entityId,
            linkedBy: 'system',
            linkedAt: new Date()
          }
        });

        console.log(`✅ [Inbound Email] Auto-linked to ${classification.entityType} ${entityId}`);
      }
    } catch (error) {
      console.error('❌ [Inbound Email] Error auto-linking:', error);
    }
  }

  /**
   * Notify relevant users about new email
   */
  async _notifyNewEmail(inboundEmail, classification) {
    try {
      const notificationService = require('./notificationService');

      // Find users who should be notified (e.g., admins, project managers)
      const usersToNotify = await this._getUsersToNotify(inboundEmail, classification);

      for (const userId of usersToNotify) {
        await notificationService.create({
          userId,
          type: 'inbound_email',
          priority: classification.confidence > 0.8 ? 'medium' : 'low',
          title: '📧 New Email Received',
          message: `From: ${inboundEmail.from}`,
          context: {
            entityType: 'inbound_email',
            entityId: inboundEmail.id,
            entityName: inboundEmail.subject,
            assignedTo: inboundEmail.from
          },
          primaryAction: {
            label: 'View Email',
            url: `/inbox/${inboundEmail.id}`,
            type: 'navigate'
          },
          secondaryActions: classification.entityType ? [
            { label: 'Link to Entity', url: `/inbox/${inboundEmail.id}/link`, type: 'modal' }
          ] : []
        });
      }
    } catch (error) {
      console.error('❌ [Inbound Email] Error notifying users:', error);
    }
  }

  /**
   * Get users who should be notified about this email
   */
  async _getUsersToNotify(inboundEmail, classification) {
    try {
      // For now, notify users with Super Admin role
      const superAdminRole = await prisma.role.findFirst({
        where: { name: 'Super Admin' },
        include: { users: true }
      });

      return superAdminRole?.users.map(ur => ur.userId) || [];
    } catch (error) {
      console.error('❌ [Inbound Email] Error getting users to notify:', error);
      return [];
    }
  }

  /**
   * Get inbox emails with filtering
   */
  async getInbox({
    status = null,
    classification = null,
    unreadOnly = false,
    limit = 50,
    offset = 0
  }) {
    try {
      const where = {};
      if (status) where.status = status;
      if (classification) where.classification = classification;
      if (unreadOnly) where.status = 'unread';

      const [emails, total] = await Promise.all([
        prisma.inboundEmail.findMany({
          where,
          take: parseInt(limit),
          skip: parseInt(offset),
          orderBy: { receivedAt: 'desc' }
        }),
        prisma.inboundEmail.count({ where })
      ]);

      return {
        emails,
        total,
        hasMore: total > offset + emails.length
      };
    } catch (error) {
      console.error('❌ [Inbound Email] Error fetching inbox:', error);
      throw error;
    }
  }

  /**
   * Mark email as read/processed
   */
  async markProcessed(emailId, userId) {
    try {
      return await prisma.inboundEmail.update({
        where: { id: emailId },
        data: {
          status: 'processed',
          processed: true,
          processedBy: userId,
          processedAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ [Inbound Email] Error marking as processed:', error);
      throw error;
    }
  }

  /**
   * Link email to entity
   */
  async linkToEntity(emailId, entityType, entityId, userId) {
    try {
      return await prisma.inboundEmail.update({
        where: { id: emailId },
        data: {
          linkedEntity: entityType,
          linkedEntityId: entityId,
          linkedBy: userId,
          linkedAt: new Date()
        }
      });
    } catch (error) {
      console.error('❌ [Inbound Email] Error linking to entity:', error);
      throw error;
    }
  }
}

// Export singleton
module.exports = new EmailInboundService();
