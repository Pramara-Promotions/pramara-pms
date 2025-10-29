# 🤖 Document Intelligence & Auto-Fill Architecture
**Last Updated:** October 24, 2025  
**Status:** Design Phase - Ready for Implementation  
**Priority:** HIGH - Core Feature for Efficiency

---

## 🎯 CORE PRINCIPLE

**"Extract Once, Verify Always"**

Every document uploaded to the system can be intelligently parsed to extract structured data. However, **USER CONFIRMATION IS MANDATORY** - no data is ever saved without explicit user approval.

---

## 📋 SCOPE - UNIVERSAL APPLICATION

### **Where This Feature Works:**
- ✅ **Email Attachments** (incoming emails)
- ✅ **Project Documents** upload
- ✅ **Compliance Documents** upload
- ✅ **Change Request** attachments
- ✅ **QC Reports** upload
- ✅ **PO Documents** upload
- ✅ **Any file upload** anywhere in the system

### **Document Types Supported:**
- 📄 **PDF** - Text extraction + OCR for scanned PDFs
- 📊 **Excel/CSV** - Structured data extraction
- 🖼️ **Images** (JPG, PNG) - OCR with Tesseract
- 📝 **Word Documents** (.docx) - Text extraction
- 📧 **Email Content** - Body text + all attachments
- 📑 **Multi-page Documents** - Extract from specific pages

---

## 🔄 USER FLOW (MANDATORY CONFIRMATION)

### **Step-by-Step Process:**

```
┌─────────────────────────────────────────────────────┐
│ 1. USER UPLOADS DOCUMENT                            │
├─────────────────────────────────────────────────────┤
│ User selects file: invoice.pdf (2.3 MB)            │
│ File uploaded to storage                            │
└─────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────┐
│ 2. SYSTEM PROMPTS (NOT AUTOMATIC)                   │
├─────────────────────────────────────────────────────┤
│ "Would you like to extract data from invoice.pdf?" │
│ [No, I'll enter manually] [Yes, extract data] ←────│
└─────────────────────────────────────────────────────┘
                      ↓
         ┌────────────┴────────────┐
         ↓                         ↓
    User clicks NO          User clicks YES
         ↓                         ↓
  Regular manual         ┌─────────────────────────────┐
  form entry             │ 3. EXTRACTION (PROCESSING)  │
                         ├─────────────────────────────┤
                         │ • Analyzing document...     │
                         │ • Extracting text...        │
                         │ • Parsing data...           │
                         │ • Calculating confidence... │
                         │ (Shows progress spinner)    │
                         └─────────────────────────────┘
                                   ↓
                         ┌─────────────────────────────┐
                         │ 4. PREVIEW MODAL (FORCED)   │
                         ├─────────────────────────────┤
                         │ Extracted Data Preview:     │
                         │                             │
                         │ PO Number: PO-2025-123      │
                         │ 🟢 High confidence (98%)    │
                         │ 📄 Source: Page 1           │
                         │                             │
                         │ Quantity: 5,000             │
                         │ 🟡 Medium (85%) - Review    │
                         │ 📄 Source: Page 2           │
                         │                             │
                         │ Pantone: PMS 185C           │
                         │ 🔴 Low (62%) - Verify!      │
                         │ 📄 Source: Page 3 (unclear) │
                         │                             │
                         │ Client Name: [Not Found]    │
                         │ ℹ️  Please enter manually   │
                         │                             │
                         │ ⚠️ IMPORTANT: Review all    │
                         │ highlighted fields before   │
                         │ proceeding.                 │
                         │                             │
                         │ [Cancel Upload]             │
                         │ [Edit Values]               │
                         │ [✓ Approve & Save]          │
                         │                             │
                         │ ❌ NO X BUTTON              │
                         │ ❌ NO ESC KEY               │
                         │ MUST CHOOSE AN ACTION       │
                         └─────────────────────────────┘
                                   ↓
                    ┌──────────────┴──────────────┐
                    ↓              ↓              ↓
            Cancel Upload    Edit Values    Approve
                    ↓              ↓              ↓
            Delete file     Open editor     Save with
            from storage    (prefilled)     source refs
                    ↓              ↓              ↓
                 Done        User edits      ✅ Complete
                            → Confirms       (audit trail)
                            → Saves
```

---

## 🎨 UI/UX REQUIREMENTS

### **1. Initial Prompt (After Upload)**
```tsx
<UploadPrompt>
  <Icon>📄</Icon>
  <Title>Document Uploaded Successfully</Title>
  <Filename>invoice.pdf (2.3 MB)</Filename>
  
  <Question>
    Would you like to extract data from this document?
  </Question>
  
  <Info>
    Our AI can automatically read and fill in details like:
    • PO Numbers
    • Quantities
    • Dates
    • Product names
    • And more...
    
    You'll review everything before saving.
  </Info>
  
  <Actions>
    <Button secondary>No, I'll enter manually</Button>
    <Button primary>✨ Yes, extract data</Button>
  </Actions>
</UploadPrompt>
```

### **2. Processing State**
```tsx
<ProcessingModal>
  <Spinner />
  <Title>Analyzing Document...</Title>
  <Progress>
    <Step completed>✓ Uploaded to storage</Step>
    <Step active>⏳ Extracting text (45%)</Step>
    <Step>Parsing data</Step>
    <Step>Calculating confidence</Step>
  </Progress>
  
  <Tip>
    💡 Tip: Higher quality scans produce better results
  </Tip>
</ProcessingModal>
```

### **3. Review Modal (FORCED - No Bypass)**
```tsx
<ReviewModal 
  canClose={false}  // NO X BUTTON
  onEscape={null}   // ESC KEY DISABLED
>
  {/* Source Reference */}
  <SourceBanner>
    📄 Data extracted from: <strong>invoice.pdf</strong>
    <ViewSourceButton>View Original</ViewSourceButton>
  </SourceBanner>
  
  {/* Extracted Fields */}
  <FieldsList>
    {/* High Confidence Field */}
    <Field confidence="high">
      <Label>PO Number *</Label>
      <ConfidenceBadge color="green">
        🟢 High Confidence (98%)
      </ConfidenceBadge>
      <Input 
        value="PO-2025-123"
        highlighted="green"
      />
      <SourceLink>
        📄 From: Page 1, Line 3 <ViewButton />
      </SourceLink>
    </Field>
    
    {/* Medium Confidence Field */}
    <Field confidence="medium">
      <Label>Quantity</Label>
      <ConfidenceBadge color="yellow">
        🟡 Medium Confidence (85%) - Please Review
      </ConfidenceBadge>
      <Input 
        value="5000"
        highlighted="yellow"
      />
      <SourceLink>
        📄 From: Page 2, Table Row 5 <ViewButton />
      </SourceLink>
      <Warning>
        ⚠️ Number format unclear - please verify
      </Warning>
    </Field>
    
    {/* Low Confidence Field */}
    <Field confidence="low">
      <Label>Pantone Code</Label>
      <ConfidenceBadge color="red">
        🔴 Low Confidence (62%) - Verify Required!
      </ConfidenceBadge>
      <Input 
        value="PMS 185C"
        highlighted="red"
        required
      />
      <SourceLink>
        📄 From: Page 3, Unclear section <ViewButton />
      </SourceLink>
      <Error>
        ⚠️ This value is uncertain. Please verify manually.
      </Error>
    </Field>
    
    {/* Not Found Field */}
    <Field confidence="none">
      <Label>Client Name</Label>
      <Badge color="gray">
        ℹ️ Not found in document
      </Badge>
      <Input 
        value=""
        placeholder="Please enter manually"
      />
      <Info>
        This information was not found in the document.
      </Info>
    </Field>
  </FieldsList>
  
  {/* Conflict Resolution (if any) */}
  {hasConflicts && (
    <ConflictSection>
      <Title>⚠️ Conflicting Data Found</Title>
      <ConflictItem>
        <Label>Quantity</Label>
        <Sources>
          <Source>
            <Origin>Email Body</Origin>
            <Value>5,000 units</Value>
            <SelectButton>Use This</SelectButton>
          </Source>
          <Source>
            <Origin>PDF Attachment (invoice.pdf)</Origin>
            <Value>6,000 units</Value>
            <SelectButton>Use This</SelectButton>
          </Source>
        </Sources>
        <Action>
          <Button>📧 Draft Confirmation Email</Button>
        </Action>
      </ConflictItem>
    </ConflictSection>
  )}
  
  {/* Mandatory Actions */}
  <Actions>
    <Button 
      variant="danger"
      onClick={handleCancel}
    >
      🗑️ Cancel & Delete Upload
    </Button>
    
    <Button 
      variant="secondary"
      onClick={handleEdit}
    >
      ✏️ Edit Values
    </Button>
    
    <Button 
      variant="primary"
      onClick={handleApprove}
      disabled={hasUnreviewedLowConfidence}
    >
      ✅ Approve & Save
    </Button>
  </Actions>
  
  {/* Warning if low confidence fields not reviewed */}
  {hasUnreviewedLowConfidence && (
    <Warning>
      ⚠️ Please review all low-confidence fields before approving
    </Warning>
  )}
</ReviewModal>
```

---

## 🔧 TECHNICAL ARCHITECTURE

### **Technology Stack:**

#### **Phase 1: Free/Local Solutions (START HERE)**
```javascript
// Core Libraries
const pdfParse = require('pdf-parse');        // PDF text extraction
const Tesseract = require('tesseract.js');    // OCR for images/scanned PDFs
const mammoth = require('mammoth');           // Word document parsing
const xlsx = require('xlsx');                 // Excel/CSV parsing
const cheerio = require('cheerio');           // HTML email parsing
```

**Capabilities:**
- ✅ Extract text from PDFs
- ✅ OCR for scanned documents and images
- ✅ Parse Excel/CSV structured data
- ✅ Extract from Word documents
- ✅ Parse HTML emails

**Limitations:**
- ❌ No intelligent field detection (needs regex patterns)
- ❌ No context understanding
- ❌ Lower accuracy on complex documents

#### **Phase 2: AI Enhancement (OPTIONAL - If Enabled)**
```javascript
// Paid APIs (Only if explicitly enabled by Super Admin)
const { OpenAI } = require('openai');                    // GPT-4 for intelligent extraction
const { DocumentAnalysisClient } = require('@azure/ai-form-recognizer'); // Azure Document Intelligence
```

**Capabilities:**
- ✅ Intelligent field detection (no regex needed)
- ✅ Context-aware extraction
- ✅ High accuracy even on complex documents
- ✅ Multi-language support
- ✅ Layout understanding

**Cost Considerations:**
- Track usage per user/per month
- Set budget limits
- Fallback to free solutions if limit exceeded

---

### **Service Architecture:**

```javascript
// api/lib/documentIntelligence.js

class DocumentIntelligenceService {
  constructor() {
    this.tesseract = null; // OCR engine
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI() : null;
    this.usageTracker = new UsageTracker(); // Track API costs
  }

  /**
   * Main extraction method
   */
  async extract(file, options = {}) {
    const { 
      fileType, 
      useAI = false,      // Super Admin toggle
      userId = null 
    } = options;

    // 1. Check user permissions
    if (!await this.canUseExtraction(userId)) {
      throw new Error('Document intelligence disabled for this user');
    }

    // 2. Check file size and decide processing method
    const fileSize = file.size;
    const processingMethod = this.determineProcessingMethod(fileSize);
    
    // 3. Extract based on file type
    let extracted;
    switch (fileType) {
      case 'pdf':
        extracted = await this.extractFromPDF(file, useAI);
        break;
      case 'excel':
        extracted = await this.extractFromExcel(file);
        break;
      case 'image':
        extracted = await this.extractFromImage(file, useAI);
        break;
      case 'docx':
        extracted = await this.extractFromWord(file);
        break;
      case 'email':
        extracted = await this.extractFromEmail(file, useAI);
        break;
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }

    // 4. Post-process and validate
    const validated = this.validateExtraction(extracted);
    
    // 5. Calculate confidence scores
    const withConfidence = this.calculateConfidence(validated);
    
    // 6. Track usage
    await this.usageTracker.log({
      userId,
      fileType,
      fileSize,
      usedAI: useAI && this.openai !== null,
      fieldsExtracted: Object.keys(withConfidence).length
    });

    return {
      data: withConfidence,
      source: {
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        extractedAt: new Date(),
        method: useAI ? 'ai' : 'local',
        processingTime: Date.now() - startTime
      }
    };
  }

  /**
   * Determine processing method based on file size
   */
  determineProcessingMethod(fileSize) {
    if (fileSize < 5 * 1024 * 1024) {
      return 'immediate'; // < 5MB: Process immediately
    } else if (fileSize < 25 * 1024 * 1024) {
      return 'delayed'; // 5-25MB: Show progress, user waits
    } else {
      return 'background'; // > 25MB: Background job, notify when done
    }
  }

  /**
   * Extract from PDF
   */
  async extractFromPDF(file, useAI) {
    // 1. Try text extraction first (fast)
    const pdfData = await pdfParse(file.buffer);
    const text = pdfData.text;

    let extracted = {};

    if (text.length > 100) {
      // PDF has extractable text
      extracted = useAI && this.openai
        ? await this.extractWithAI(text, 'pdf')
        : await this.extractWithRegex(text, 'pdf');
    } else {
      // PDF is likely scanned, use OCR
      extracted = await this.extractWithOCR(file.buffer);
    }

    return extracted;
  }

  /**
   * Extract from Excel/CSV
   */
  async extractFromExcel(file) {
    const workbook = xlsx.read(file.buffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(firstSheet);

    // Look for common field names in headers
    const extracted = {};
    const patterns = {
      poNumber: ['po', 'purchase order', 'po number', 'order no'],
      quantity: ['qty', 'quantity', 'units', 'pieces'],
      productName: ['product', 'item', 'description', 'name'],
      // ... more patterns
    };

    // Find matching columns
    for (const [field, keywords] of Object.entries(patterns)) {
      for (const row of data) {
        for (const [col, value] of Object.entries(row)) {
          if (keywords.some(kw => col.toLowerCase().includes(kw))) {
            extracted[field] = value;
            break;
          }
        }
        if (extracted[field]) break;
      }
    }

    return extracted;
  }

  /**
   * Extract from Image (OCR)
   */
  async extractFromImage(file, useAI) {
    // Use Tesseract for OCR
    const { data: { text } } = await Tesseract.recognize(file.buffer, 'eng');

    return useAI && this.openai
      ? await this.extractWithAI(text, 'image')
      : await this.extractWithRegex(text, 'image');
  }

  /**
   * Extract from Email (body + attachments)
   */
  async extractFromEmail(email, useAI) {
    const extracted = {};

    // 1. Extract from email body
    const bodyText = email.html || email.text || '';
    const bodyExtracted = useAI && this.openai
      ? await this.extractWithAI(bodyText, 'email_body')
      : await this.extractWithRegex(bodyText, 'email_body');

    Object.assign(extracted, bodyExtracted);

    // 2. Extract from attachments
    if (email.attachments && email.attachments.length > 0) {
      for (const attachment of email.attachments) {
        const attachmentExtracted = await this.extract({
          buffer: attachment.content,
          name: attachment.filename,
          type: attachment.contentType,
          size: attachment.size
        }, { useAI });

        // Merge with conflict detection
        for (const [key, value] of Object.entries(attachmentExtracted.data)) {
          if (extracted[key] && extracted[key] !== value) {
            // CONFLICT DETECTED
            extracted[`${key}_conflict`] = {
              emailBody: extracted[key],
              attachment: value,
              attachmentName: attachment.filename,
              requiresResolution: true
            };
          } else {
            extracted[key] = value;
          }
        }
      }
    }

    return extracted;
  }

  /**
   * Extract using Regex patterns (FREE)
   */
  async extractWithRegex(text, sourceType) {
    const patterns = {
      poNumber: [
        /PO[:\s#-]*([A-Z0-9-]+)/gi,
        /Purchase\s+Order[:\s#]*([A-Z0-9-]+)/gi,
        /Order\s+No[:\s#]*([A-Z0-9-]+)/gi
      ],
      quantity: [
        /(?:qty|quantity)[:\s]*([0-9,]+)/gi,
        /([0-9,]+)\s*(?:units|pcs|pieces)/gi
      ],
      pantoneCode: [
        /(?:pantone|PMS)[:\s]*([0-9]+\s*[A-Z])/gi,
        /PMS\s*([0-9]+\s*[A-Z])/gi
      ],
      date: [
        /\d{4}-\d{2}-\d{2}/g,
        /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g
      ],
      email: [
        /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi
      ],
      phone: [
        /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
      ]
    };

    const extracted = {};

    for (const [field, regexArray] of Object.entries(patterns)) {
      for (const regex of regexArray) {
        const matches = text.match(regex);
        if (matches && matches.length > 0) {
          extracted[field] = {
            value: matches[0].replace(/^(PO|Quantity|Pantone|PMS)[:\s#-]*/i, '').trim(),
            confidence: 0.85, // Regex = medium-high confidence
            source: sourceType,
            method: 'regex'
          };
          break;
        }
      }
    }

    return extracted;
  }

  /**
   * Extract using AI (PAID - Optional)
   */
  async extractWithAI(text, sourceType) {
    if (!this.openai) {
      throw new Error('AI extraction not enabled');
    }

    const prompt = `
      Extract the following structured data from this document:
      - PO Number (poNumber)
      - Project Name (projectName)
      - Quantity (quantity)
      - Cutoff Date (cutoffDate)
      - Pantone Code (pantoneCode)
      - Client Name (clientName)
      - SKU Code (skuCode)
      
      Document content:
      ${text.substring(0, 4000)} // Limit to 4000 chars
      
      Return ONLY valid JSON with extracted fields. If a field is not found, omit it.
      Format: { "poNumber": "...", "quantity": 5000, ... }
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.1 // Low temperature for consistent extraction
    });

    const extracted = JSON.parse(response.choices[0].message.content);

    // Add metadata
    for (const key of Object.keys(extracted)) {
      extracted[key] = {
        value: extracted[key],
        confidence: 0.95, // AI = high confidence
        source: sourceType,
        method: 'ai'
      };
    }

    return extracted;
  }

  /**
   * Calculate confidence scores
   */
  calculateConfidence(extracted) {
    const withConfidence = {};

    for (const [field, data] of Object.entries(extracted)) {
      let confidence = data.confidence || 0.5;

      // Adjust based on validation
      if (this.validateField(field, data.value)) {
        confidence = Math.min(confidence + 0.1, 1.0);
      } else {
        confidence = Math.max(confidence - 0.2, 0.0);
      }

      withConfidence[field] = {
        ...data,
        confidence,
        confidenceLevel: this.getConfidenceLevel(confidence)
      };
    }

    return withConfidence;
  }

  /**
   * Get confidence level label
   */
  getConfidenceLevel(confidence) {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    return 'low';
  }

  /**
   * Validate field value
   */
  validateField(field, value) {
    const validators = {
      poNumber: (v) => /^[A-Z0-9-]+$/.test(v),
      quantity: (v) => !isNaN(parseInt(v)) && parseInt(v) > 0,
      date: (v) => !isNaN(Date.parse(v)),
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      pantoneCode: (v) => /^PMS?\s*\d+\s*[A-Z]?$/i.test(v)
    };

    return validators[field] ? validators[field](value) : true;
  }

  /**
   * Check if user can use extraction
   */
  async canUseExtraction(userId) {
    if (!userId) return true; // System emails

    const systemEnabled = await this.getSystemSetting('documentIntelligenceEnabled');
    if (!systemEnabled) return false;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { canUseDocumentIntelligence: true }
    });

    return user?.canUseDocumentIntelligence || false;
  }

  /**
   * Get system setting
   */
  async getSystemSetting(key) {
    const setting = await prisma.systemSetting.findUnique({
      where: { key }
    });
    return setting ? setting.value : false;
  }
}

module.exports = new DocumentIntelligenceService();
```

---

## 🗄️ DATABASE SCHEMA

```prisma
// ============================================
// SYSTEM SETTINGS
// ============================================

model SystemSetting {
  // ... existing fields ...
  
  // Document Intelligence
  documentIntelligenceEnabled       Boolean @default(false)
  documentIntelligenceTrainingMode  Boolean @default(true)
  documentIntelligenceUseAI         Boolean @default(false)
  documentIntelligenceMonthlyLimit  Int?    @default(1000) // API calls per month
}

// ============================================
// USER PERMISSIONS
// ============================================

model User {
  // ... existing fields ...
  
  // Document Intelligence Permission
  canUseDocumentIntelligence Boolean @default(false)
  
  // Usage tracking
  documentIntelligenceUsage  DocumentIntelligenceUsage[]
}

// ============================================
// USAGE TRACKING
// ============================================

model DocumentIntelligenceUsage {
  id              String   @id @default(cuid())
  userId          String
  fileType        String   // 'pdf', 'excel', 'image', 'email'
  fileSize        Int      // bytes
  usedAI          Boolean  @default(false)
  fieldsExtracted Int      // count
  processingTime  Int      // milliseconds
  cost            Float?   // if using paid API
  createdAt       DateTime @default(now())
  
  user            User     @relation(fields: [userId], references: [id])
  
  @@index([userId, createdAt])
}

// ============================================
// EXTRACTION LOGS (Audit Trail)
// ============================================

model DocumentExtractionLog {
  id                String   @id @default(cuid())
  
  // Source
  sourceType        String   // 'email', 'document', 'attachment'
  sourceId          String   // ID of email/document
  filename          String
  fileType          String
  fileSize          Int
  
  // Extraction
  extractedData     Json     // Raw extracted data
  confidence        Json     // Confidence scores
  method            String   // 'regex', 'ai', 'ocr'
  processingTime    Int      // milliseconds
  
  // User Action
  userId            String?
  approved          Boolean  @default(false)
  approvedAt        DateTime?
  editedFields      String[] // Fields user manually edited
  
  // Result
  createdEntityType String?  // 'project', 'document', 'change'
  createdEntityId   String?
  
  createdAt         DateTime @default(now())
  
  user              User?    @relation(fields: [userId], references: [id])
  
  @@index([sourceType, sourceId])
  @@index([userId, createdAt])
}

// ============================================
// ENTITY UPDATES (Add to existing models)
// ============================================

model Project {
  // ... existing fields ...
  
  // Source tracking
  sourceType        String?  // 'manual', 'email', 'document'
  sourceEmailId     String?
  sourceDocumentId  String?
  extractedData     Json?    // What was extracted
  extractionApproval Json?   // { approvedBy, approvedAt, editedFields }
  
  sourceEmail       IncomingEmail? @relation(fields: [sourceEmailId], references: [id])
}

model ProjectDocument {
  // ... existing fields ...
  
  // Source tracking
  sourceType        String?
  sourceEmailId     String?
  sourceDocumentId  String?
  extractedData     Json?
  extractionApproval Json?
}

model ChangeLog {
  // ... existing fields ...
  
  // Source tracking
  sourceType        String?
  sourceEmailId     String?
  sourceDocumentId  String?
  extractedData     Json?
  extractionApproval Json?
}

model ComplianceItem {
  // ... existing fields ...
  
  // Source tracking
  sourceType        String?
  sourceEmailId     String?
  sourceDocumentId  String?
  extractedData     Json?
  extractionApproval Json?
}

// ... Add to ALL entities that accept document uploads
```

---

## ⚙️ SUPER ADMIN CONTROLS

### **Settings UI:**

```tsx
// web/src/pages/admin/DocumentIntelligenceSettings.tsx

<SettingsPage>
  <Header>
    <Title>🤖 Document Intelligence Settings</Title>
    <Description>
      Configure AI-powered data extraction from documents
    </Description>
  </Header>
  
  {/* System-Wide Controls */}
  <Section title="System-Wide Settings">
    <Toggle
      label="Enable Document Intelligence"
      description="Allow users to extract data from uploaded documents"
      checked={settings.documentIntelligenceEnabled}
      onChange={handleToggle('documentIntelligenceEnabled')}
    />
    
    <Toggle
      label="Training Mode"
      description="Simulate extraction without using API credits"
      checked={settings.documentIntelligenceTrainingMode}
      onChange={handleToggle('documentIntelligenceTrainingMode')}
      disabled={!settings.documentIntelligenceEnabled}
    />
    
    {settings.documentIntelligenceTrainingMode && (
      <Alert color="yellow">
        🎓 Training Mode Active: All extractions are simulated.
        No actual processing or API calls are made.
      </Alert>
    )}
    
    <Toggle
      label="Use AI Enhancement"
      description="Use GPT-4 for better accuracy (requires OpenAI API key)"
      checked={settings.documentIntelligenceUseAI}
      onChange={handleToggle('documentIntelligenceUseAI')}
      disabled={!process.env.OPENAI_API_KEY}
    />
    
    {!process.env.OPENAI_API_KEY && (
      <Alert color="info">
        ℹ️ OpenAI API key not configured. Using free local extraction only.
      </Alert>
    )}
    
    <Input
      type="number"
      label="Monthly Limit (per user)"
      description="Maximum API calls per user per month"
      value={settings.documentIntelligenceMonthlyLimit}
      onChange={handleChange('documentIntelligenceMonthlyLimit')}
    />
  </Section>
  
  {/* Usage Statistics */}
  <Section title="Usage Statistics (This Month)">
    <StatCard>
      <Label>Total Extractions</Label>
      <Value>{stats.totalExtractions}</Value>
    </StatCard>
    
    <StatCard>
      <Label>AI Calls</Label>
      <Value>{stats.aiCalls}</Value>
      <SubValue>
        {stats.aiCallsPercent}% of total
      </SubValue>
    </StatCard>
    
    <StatCard>
      <Label>Estimated Cost</Label>
      <Value>${stats.estimatedCost}</Value>
      <SubValue>
        ${stats.costPerExtraction} per extraction
      </SubValue>
    </StatCard>
    
    <StatCard>
      <Label>Success Rate</Label>
      <Value>{stats.successRate}%</Value>
      <SubValue>
        {stats.approved} approved, {stats.rejected} rejected
      </SubValue>
    </StatCard>
  </Section>
  
  {/* User Permissions */}
  <Section title="User Permissions">
    <SearchBar 
      placeholder="Search users..."
      value={searchQuery}
      onChange={setSearchQuery}
    />
    
    <Button onClick={handleEnableAll}>
      ✅ Enable for All Users
    </Button>
    
    <Button onClick={handleDisableAll}>
      ❌ Disable for All Users
    </Button>
    
    <UserList>
      {users.map(user => (
        <UserRow key={user.id}>
          <UserInfo>
            <Name>{user.name}</Name>
            <Email>{user.email}</Email>
          </UserInfo>
          
          <UsageInfo>
            <Stat>
              {user.extractionsThisMonth} extractions
            </Stat>
            <Stat>
              ${user.costThisMonth} cost
            </Stat>
          </UsageInfo>
          
          <Toggle
            checked={user.canUseDocumentIntelligence}
            onChange={() => handleUserToggle(user.id)}
          />
        </UserRow>
      ))}
    </UserList>
  </Section>
  
  {/* Save Button */}
  <SaveButton onClick={handleSave}>
    💾 Save Settings
  </SaveButton>
</SettingsPage>
```

---

## 🔄 CONFLICT RESOLUTION FLOW

### **When Conflicts Detected:**

```typescript
// Conflict: Email body says "Qty: 5000" but PDF says "Qty: 6000"

<ConflictResolutionModal>
  <Header>
    <Icon>⚠️</Icon>
    <Title>Conflicting Data Detected</Title>
  </Header>
  
  <Description>
    We found different values for the same field from multiple sources.
    Please review and select the correct value.
  </Description>
  
  <ConflictItem>
    <FieldLabel>Quantity</FieldLabel>
    
    <Sources>
      <Source 
        selected={selectedSource === 'email'}
        onClick={() => setSelectedSource('email')}
      >
        <Origin>
          <Icon>📧</Icon>
          <Label>Email Body</Label>
        </Origin>
        <Value>5,000 units</Value>
        <Confidence>
          <Badge color="green">High (95%)</Badge>
        </Confidence>
        <Preview>
          "...order quantity is 5,000 units..."
        </Preview>
      </Source>
      
      <Source 
        selected={selectedSource === 'pdf'}
        onClick={() => setSelectedSource('pdf')}
      >
        <Origin>
          <Icon>📄</Icon>
          <Label>PDF Attachment (invoice.pdf)</Label>
        </Origin>
        <Value>6,000 units</Value>
        <Confidence>
          <Badge color="yellow">Medium (85%)</Badge>
        </Confidence>
        <Preview>
          Table Row 5: "Qty: 6,000"
        </Preview>
      </Source>
    </Sources>
    
    <CustomOption>
      <Label>Or enter manually:</Label>
      <Input 
        type="number"
        placeholder="Enter quantity"
        value={customValue}
        onChange={setCustomValue}
      />
    </CustomOption>
  </ConflictItem>
  
  {/* Action: Draft Confirmation Email */}
  <ActionSection>
    <Title>Need Clarification?</Title>
    <Description>
      Send an email to the sender asking for confirmation
    </Description>
    
    <Button onClick={handleDraftEmail}>
      📧 Draft Confirmation Email
    </Button>
  </ActionSection>
  
  {/* Confirmation Actions */}
  <Actions>
    <Button secondary onClick={handleCancel}>
      Cancel
    </Button>
    
    <Button 
      primary 
      onClick={handleConfirm}
      disabled={!selectedSource && !customValue}
    >
      ✅ Confirm Selection
    </Button>
  </Actions>
</ConflictResolutionModal>
```

### **Draft Confirmation Email Modal:**

```tsx
<DraftEmailModal>
  <Header>
    <Title>📧 Draft Confirmation Email</Title>
  </Header>
  
  {/* Pre-filled Email */}
  <EmailForm>
    <Field>
      <Label>To:</Label>
      <Input value={conflictSource.email} readOnly />
    </Field>
    
    <Field>
      <Label>Subject:</Label>
      <Input 
        value={`Clarification Needed: ${conflictField}`}
        onChange={setSubject}
      />
    </Field>
    
    <Field>
      <Label>Message:</Label>
      <Textarea value={emailBody} onChange={setEmailBody}>
        {`Dear ${senderName},

We received your ${sourceType} regarding ${projectName}.

We noticed some conflicting information and would like to confirm:

Field: ${conflictField}
Your email states: ${emailValue}
Attached document states: ${pdfValue}

Could you please confirm which value is correct?

Best regards,
${currentUser.name}`}
      </Textarea>
    </Field>
  </EmailForm>
  
  <Actions>
    <Button secondary onClick={handleCancel}>
      Cancel
    </Button>
    
    <Button secondary onClick={handleSaveDraft}>
      💾 Save Draft
    </Button>
    
    <Button primary onClick={handleSendEmail}>
      📧 Send Email
    </Button>
  </Actions>
</DraftEmailModal>
```

---

## 📊 FILE SIZE HANDLING

### **Processing Methods:**

| File Size | Method | User Experience |
|-----------|--------|-----------------|
| **< 5 MB** | Immediate | Process instantly, show results in 2-5 seconds |
| **5-25 MB** | Delayed | Show progress bar, user waits 10-30 seconds |
| **> 25 MB** | Background | Process in background, notify when complete |
| **> 100 MB** | Reject or Background | Ask user if they want to wait or process later |

### **Implementation:**

```typescript
// Frontend: File Upload Handler
const handleFileUpload = async (file: File) => {
  const fileSize = file.size;
  
  // 1. Upload file
  const uploaded = await uploadFile(file);
  
  // 2. Ask: Extract data?
  const wantsExtraction = await showPrompt("Extract data from this document?");
  
  if (!wantsExtraction) {
    return handleManualEntry();
  }
  
  // 3. Determine processing method
  if (fileSize < 5 * 1024 * 1024) {
    // < 5MB: Immediate processing
    setProcessingStatus('Extracting data...');
    const result = await extractData(uploaded.id);
    showReviewModal(result);
    
  } else if (fileSize < 25 * 1024 * 1024) {
    // 5-25MB: Show progress
    setProcessingStatus('Processing large file...');
    setShowProgress(true);
    
    const result = await extractDataWithProgress(uploaded.id, (progress) => {
      setProgress(progress); // Update progress bar
    });
    
    setShowProgress(false);
    showReviewModal(result);
    
  } else if (fileSize < 100 * 1024 * 1024) {
    // 25-100MB: Background processing
    const choice = await showDialog({
      title: "Large File Detected",
      message: "This file is quite large and will take several minutes to process. How would you like to proceed?",
      options: [
        { label: "Process Now (wait)", value: "wait" },
        { label: "Process in Background (notify me)", value: "background" },
        { label: "Cancel", value: "cancel" }
      ]
    });
    
    if (choice === 'wait') {
      // Same as 5-25MB flow
      setProcessingStatus('Processing very large file... This may take a few minutes.');
      setShowProgress(true);
      const result = await extractDataWithProgress(uploaded.id, setProgress);
      setShowProgress(false);
      showReviewModal(result);
      
    } else if (choice === 'background') {
      // Queue for background processing
      await queueExtractionJob(uploaded.id);
      showToast('success', 'File queued for processing. You\'ll be notified when ready.');
      
      // User can continue working
      // When done, show notification:
      // "✅ Extraction Complete: invoice.pdf - Click to review"
    }
    
  } else {
    // > 100MB: Too large
    showError('File too large for extraction. Maximum size: 100MB');
    await deleteFile(uploaded.id);
  }
};
```

### **Background Processing Notification:**

```tsx
// When background job completes, show notification
<Notification>
  <Icon>✅</Icon>
  <Content>
    <Title>Extraction Complete</Title>
    <Message>
      Data extracted from <strong>{filename}</strong>
    </Message>
  </Content>
  <Actions>
    <Button onClick={handleReview}>
      Review Data
    </Button>
    <Button onClick={handleDismiss}>
      Later
    </Button>
  </Actions>
</Notification>
```

---

## 🎯 IMPLEMENTATION PHASES

### **Phase 1: Foundation (Week 1)**
- ✅ Database schema updates
- ✅ DocumentIntelligenceService (local extraction only)
- ✅ Basic UI components (prompt, review modal)
- ✅ Super Admin settings page
- ✅ User permission checks

### **Phase 2: Core Extraction (Week 2)**
- ✅ PDF extraction (text + OCR)
- ✅ Excel/CSV parsing
- ✅ Image OCR
- ✅ Email parsing (body + attachments)
- ✅ Confidence scoring
- ✅ Source reference tracking

### **Phase 3: UI/UX Polish (Week 3)**
- ✅ Processing states (immediate, delayed, background)
- ✅ Conflict resolution UI
- ✅ Draft email functionality
- ✅ Field highlighting and badges
- ✅ Source viewing (click to see original)

### **Phase 4: AI Enhancement (Week 4 - Optional)**
- ✅ OpenAI GPT-4 integration
- ✅ Azure Document Intelligence integration
- ✅ Usage tracking and cost monitoring
- ✅ Monthly limits per user
- ✅ Fallback to local if limit exceeded

### **Phase 5: Integration (Week 5)**
- ✅ Integrate with all upload points:
  - Project creation
  - Document upload
  - Compliance upload
  - Change requests
  - QC reports
  - Email inbox

---

## ✅ SUCCESS CRITERIA

### **User Experience:**
- [ ] User can upload any supported file type
- [ ] System asks permission before extracting
- [ ] Extraction completes within reasonable time
- [ ] Preview modal shows all extracted data
- [ ] Confidence scores are accurate and clear
- [ ] User can easily edit any field
- [ ] Low confidence fields require verification
- [ ] Conflicts are clearly presented
- [ ] Source references are always visible
- [ ] User approval is MANDATORY (no bypass)

### **Technical:**
- [ ] Extraction accuracy ≥ 85% for high-quality documents
- [ ] Processing time < 5s for files < 5MB
- [ ] Processing time < 30s for files < 25MB
- [ ] Background jobs complete within 5 minutes
- [ ] API costs stay within budget
- [ ] System handles all file formats gracefully
- [ ] Errors are logged and recoverable
- [ ] Audit trail is complete

### **Security & Compliance:**
- [ ] User permissions are enforced
- [ ] System-wide toggle works correctly
- [ ] Training mode doesn't use real APIs
- [ ] Source references are immutable
- [ ] Extraction logs are auditable
- [ ] No data is saved without user approval
- [ ] File uploads are virus-scanned
- [ ] Sensitive data is handled securely

---

## 🚫 OUT OF SCOPE (For Now)

- Real-time collaboration on extraction review
- Multi-user approval workflow
- Batch extraction (multiple files at once)
- Custom extraction templates per client
- Machine learning model training
- Mobile app support
- Offline extraction

---

## 📝 NOTES

### **Important Reminders:**
1. **NEVER auto-save** extracted data without user approval
2. **ALWAYS show** source reference for every field
3. **ALWAYS ask** user if they want extraction (not automatic)
4. **FORCE confirmation** for low-confidence fields
5. **Handle conflicts** gracefully with user input
6. **Track usage** to manage API costs
7. **Start with free** tools, enhance with AI later
8. **Test thoroughly** with real documents

### **Testing Checklist:**
- [ ] Test with perfect PDFs (machine-generated)
- [ ] Test with scanned PDFs (OCR quality)
- [ ] Test with images (various quality levels)
- [ ] Test with Excel files (various formats)
- [ ] Test with emails (body + attachments)
- [ ] Test with conflicting data
- [ ] Test with missing data
- [ ] Test with very large files (> 100MB)
- [ ] Test with corrupted files
- [ ] Test with unsupported formats

---

**Last Updated:** October 24, 2025  
**Next Review:** After Phase 1 implementation (1 week)

---

**READY TO BUILD!** 🚀
