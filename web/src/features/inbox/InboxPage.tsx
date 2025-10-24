// web/src/features/inbox/InboxPage.tsx
// Inbound Email Inbox UI

import { useState, useEffect } from 'react';

interface InboundEmail {
  id: string;
  messageId: string;
  from: string;
  to: string[];
  subject: string;
  textBody?: string;
  htmlBody?: string;
  hasAttachments: boolean;
  attachmentCount: number;
  attachments?: Array<{ filename: string; size: number; mimeType: string; key: string }>;
  classified: boolean;
  classification?: string;
  confidence?: number;
  linkedEntity?: string;
  linkedEntityId?: string;
  status: string;
  receivedAt: string;
}

export default function InboxPage() {
  const [emails, setEmails] = useState<InboundEmail[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<InboundEmail | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'processed'>('all');
  const [classificationFilter, setClassificationFilter] = useState<string>('');

  useEffect(() => {
    fetchEmails();
  }, [filter, classificationFilter]);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'unread') params.append('status', 'unread');
      if (filter === 'processed') params.append('status', 'processed');
      if (classificationFilter) params.append('classification', classificationFilter);
      params.append('limit', '50');

      const res = await fetch(`/api/inbox?${params}`, {
        credentials: 'include',
      });
      const data = await res.json();
      
      setEmails(data.emails || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewEmail = async (email: InboundEmail) => {
    setSelectedEmail(email);
    
    // Mark as read
    if (email.status === 'unread') {
      try {
        await fetch(`/api/inbox/${email.id}`, {
          credentials: 'include',
        });
        
        setEmails(prev =>
          prev.map(e => (e.id === email.id ? { ...e, status: 'read' } : e))
        );
      } catch (error) {
        console.error('Error marking as read:', error);
      }
    }
  };

  const markAsProcessed = async (id: string) => {
    try {
      await fetch(`/api/inbox/${id}/processed`, {
        method: 'PATCH',
        credentials: 'include',
      });
      
      setEmails(prev =>
        prev.map(e => (e.id === id ? { ...e, status: 'processed', processed: true } : e))
      );
      
      if (selectedEmail?.id === id) {
        setSelectedEmail(prev => prev ? { ...prev, status: 'processed', processed: true } : null);
      }
    } catch (error) {
      console.error('Error marking as processed:', error);
    }
  };

  const archiveEmail = async (id: string) => {
    try {
      await fetch(`/api/inbox/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      setEmails(prev => prev.filter(e => e.id !== id));
      
      if (selectedEmail?.id === id) {
        setSelectedEmail(null);
      }
    } catch (error) {
      console.error('Error archiving email:', error);
    }
  };

  const downloadAttachment = async (emailId: string, index: number) => {
    try {
      const res = await fetch(`/api/inbox/${emailId}/attachments/${index}`, {
        credentials: 'include',
      });
      const data = await res.json();
      
      // Open download URL in new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error downloading attachment:', error);
    }
  };

  const getClassificationBadge = (classification?: string, confidence?: number) => {
    if (!classification) return null;
    
    const colors: Record<string, string> = {
      invoice: 'bg-green-100 text-green-800',
      po: 'bg-blue-100 text-blue-800',
      spec: 'bg-purple-100 text-purple-800',
      artwork: 'bg-pink-100 text-pink-800',
      quote: 'bg-yellow-100 text-yellow-800',
      shipment: 'bg-orange-100 text-orange-800',
      qc: 'bg-red-100 text-red-800',
      general: 'bg-gray-100 text-gray-800',
    };
    
    const color = colors[classification] || colors.general;
    const confidencePercent = confidence ? Math.round(confidence * 100) : 0;
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
        {classification.toUpperCase()}
        {confidence && (
          <span className="ml-1 opacity-75">({confidencePercent}%)</span>
        )}
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Email List */}
      <div className="w-1/3 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          <p className="text-sm text-gray-500 mt-1">{emails.length} emails</p>
        </div>

        {/* Filters */}
        <div className="border-b px-4 py-3 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter('processed')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === 'processed'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Processed
            </button>
          </div>
          
          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Types</option>
            <option value="invoice">Invoice</option>
            <option value="po">Purchase Order</option>
            <option value="spec">Specification</option>
            <option value="artwork">Artwork</option>
            <option value="quote">Quote</option>
            <option value="shipment">Shipment</option>
            <option value="qc">QC</option>
          </select>
        </div>

        {/* Email List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No emails</p>
            </div>
          ) : (
            <div className="divide-y">
              {emails.map((email) => (
                <div
                  key={email.id}
                  onClick={() => viewEmail(email)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedEmail?.id === email.id ? 'bg-blue-50' : ''
                  } ${email.status === 'unread' ? 'font-semibold' : ''}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm text-gray-900 truncate flex-1">
                      {email.from}
                    </p>
                    {email.status === 'unread' && (
                      <span className="ml-2 w-2 h-2 bg-blue-600 rounded-full"></span>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-900 mb-1 truncate">
                    {email.subject || '(No Subject)'}
                  </p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {getClassificationBadge(email.classification, email.confidence)}
                    
                    {email.hasAttachments && (
                      <span className="text-xs text-gray-500">
                        📎 {email.attachmentCount}
                      </span>
                    )}
                    
                    {email.linkedEntity && (
                      <span className="text-xs text-green-600">
                        🔗 Linked
                      </span>
                    )}
                    
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(email.receivedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Email Detail */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedEmail ? (
          <>
            {/* Header */}
            <div className="border-b px-6 py-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">
                    {selectedEmail.subject || '(No Subject)'}
                  </h2>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium">From:</span> {selectedEmail.from}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">To:</span> {selectedEmail.to.join(', ')}
                    </p>
                    <p className="text-gray-400">
                      {new Date(selectedEmail.receivedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {selectedEmail.status !== 'processed' && (
                    <button
                      onClick={() => markAsProcessed(selectedEmail.id)}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                    >
                      Mark Processed
                    </button>
                  )}
                  <button
                    onClick={() => archiveEmail(selectedEmail.id)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
                  >
                    Archive
                  </button>
                </div>
              </div>
              
              {/* Classification */}
              <div className="flex items-center gap-3">
                {getClassificationBadge(selectedEmail.classification, selectedEmail.confidence)}
                
                {selectedEmail.linkedEntity && (
                  <span className="text-sm text-green-600 font-medium">
                    🔗 Linked to {selectedEmail.linkedEntity}: {selectedEmail.linkedEntityId}
                  </span>
                )}
              </div>
            </div>

            {/* Attachments */}
            {selectedEmail.hasAttachments && selectedEmail.attachments && (
              <div className="border-b px-6 py-4 bg-gray-50">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Attachments ({selectedEmail.attachmentCount})
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedEmail.attachments.map((attachment, idx) => (
                    <button
                      key={idx}
                      onClick={() => downloadAttachment(selectedEmail.id, idx)}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                    >
                      <span>📎</span>
                      <span>{attachment.filename}</span>
                      <span className="text-gray-400">
                        ({Math.round(attachment.size / 1024)} KB)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {selectedEmail.htmlBody ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }}
                />
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
                  {selectedEmail.textBody}
                </pre>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Select an email to view</p>
          </div>
        )}
      </div>
    </div>
  );
}
