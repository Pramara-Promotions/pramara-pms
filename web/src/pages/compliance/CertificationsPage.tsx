import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Shield, Calendar, AlertTriangle, CheckCircle, Clock, Stamp } from 'lucide-react';
import { listCertifications, createCertification, updateCertification, deleteCertification } from '../../lib/services/compliance';
import { presignDocumentUpload, getDocumentGetUrl } from '../../lib/services/documents';
import { createApproval } from '../../lib/services/approvals';

interface CompanyCertification {
  id: string;
  certificationType: string;
  certificationName: string;
  certificationBody: string;
  certificateNumber: string;
  certificateFileUrl: string | null;
  issueDate: string;
  expiryDate: string;
  lastAuditDate: string | null;
  nextAuditDate: string | null;
  scope: string | null;
  status: string;
  responsible: { id: string; name: string; email: string };
  _count: { audits: number; reminders: number };
}

const CertificationsPage = () => {
  const [certifications, setCertifications] = useState<CompanyCertification[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<CompanyCertification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [formData, setFormData] = useState({
    certificationType: 'quality',
    certificationName: '',
    certificationBody: '',
    certificateNumber: '',
    certificateFileUrl: '',
    issueDate: '',
    expiryDate: '',
    lastAuditDate: '',
    nextAuditDate: '',
    scope: '',
    responsiblePerson: '',
    reminderDays: 90,
    notes: '',
  });
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalCert, setApprovalCert] = useState<CompanyCertification | null>(null);
  const [approvalForm, setApprovalForm] = useState({
    contactPerson: '',
    contactEmail: '',
    dueDate: '',
    expectedDate: '',
    priority: 'medium' as 'low'|'medium'|'high',
  });

  const certTypes = [
    { value: 'quality', label: 'Quality (ISO 9001, etc.)' },
    { value: 'environmental', label: 'Environmental (ISO 14001, etc.)' },
    { value: 'safety', label: 'Safety (ISO 45001, etc.)' },
    { value: 'social', label: 'Social (SMETA, SA8000, etc.)' },
    { value: 'product', label: 'Product (CE, GRS, GOTS, etc.)' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchCertifications();
  }, [statusFilter, typeFilter]);

  // Paste event listener for screenshot support
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Only handle paste when modal is open
      if (!isModalOpen) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      // Look for image in clipboard
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          if (!blob) continue;

          // Generate filename with timestamp
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          const file = new File([blob], `screenshot-${timestamp}.png`, { type: blob.type });

          // Upload the file
          setUploading(true);
          setUploadedFileName(file.name);
          try {
            const presign = await presignDocumentUpload({
              projectId: 'company',
              filename: file.name,
              contentType: file.type,
              sizeBytes: file.size,
            });
            await fetch(presign.url, {
              method: 'PUT',
              headers: { 'Content-Type': presign.headers?.['Content-Type'] || file.type },
              body: file,
            });
            setFormData((prev) => ({ ...prev, certificateFileUrl: presign.key }));
            
            // Show success message
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            toast.textContent = '✓ Screenshot uploaded successfully';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
          } catch (err) {
            console.error('Screenshot upload failed:', err);
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
            toast.textContent = '✗ Screenshot upload failed';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
          } finally {
            setUploading(false);
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [isModalOpen]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);
    setUploadedFileName(file.name);

    try {
      const presign = await presignDocumentUpload({
        projectId: 'company',
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });

      await fetch(presign.url, {
        method: 'PUT',
        headers: { 'Content-Type': presign.headers?.['Content-Type'] || file.type || 'application/octet-stream' },
        body: file,
      });

      setFormData((prev) => ({ ...prev, certificateFileUrl: presign.key }));
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const fetchCertifications = async () => {
    setIsLoading(true);
    try {
      const rows = await listCertifications({ status: statusFilter });
      setCertifications(rows || []);
    } catch (error) {
      console.error('Error fetching certifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (editingCert) {
        await updateCertification(editingCert.id, formData);
      } else {
        await createCertification(formData);
      }
      setIsModalOpen(false);
      setEditingCert(null);
      resetForm();
      fetchCertifications();
    } catch (error) {
      console.error('Error saving certification:', error);
      alert('Failed to save certification');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this certification?')) return;
    try {
      await deleteCertification(id);
      fetchCertifications();
    } catch (error) {
      console.error('Error deleting certification:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      certificationType: 'quality',
      certificationName: '',
      certificationBody: '',
      certificateNumber: '',
      certificateFileUrl: '',
      issueDate: '',
      expiryDate: '',
      lastAuditDate: '',
      nextAuditDate: '',
      scope: '',
      responsiblePerson: '',
      reminderDays: 90,
      notes: '',
    });
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    return Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (cert: CompanyCertification) => {
    const daysUntil = getDaysUntilExpiry(cert.expiryDate);
    if (daysUntil <= 0) return { color: 'bg-red-100 text-red-800', label: 'EXPIRED', icon: AlertTriangle };
    if (daysUntil <= 30) return { color: 'bg-red-100 text-red-800', label: `${daysUntil}d left`, icon: AlertTriangle };
    if (daysUntil <= 90) return { color: 'bg-yellow-100 text-yellow-800', label: `${daysUntil}d left`, icon: Clock };
    return { color: 'bg-green-100 text-green-800', label: 'Active', icon: CheckCircle };
  };

  const openCertificate = async (fileRef?: string | null) => {
    if (!fileRef) return;
    try {
      // If it's an absolute URL, open directly
      if (/^https?:\/\//i.test(fileRef)) {
        window.open(fileRef, '_blank', 'noopener');
        return;
      }
      // Otherwise treat as storage key and request a presigned GET URL
      const { url } = await getDocumentGetUrl(fileRef);
      if (url) window.open(url, '_blank', 'noopener');
    } catch (e) {
      console.error('Failed to open certificate:', e);
      alert('Unable to open certificate.');
    }
  };

  const handleFilePick = () => fileInputRef.current?.click();

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadedFileName(file.name);
    try {
      // Use a global bucket path under a special pseudo projectId "company"
      const presign = await presignDocumentUpload({
        projectId: 'company',
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
      // Upload via presigned PUT
      await fetch(presign.url, {
        method: 'PUT',
        headers: { 'Content-Type': presign.headers?.['Content-Type'] || file.type || 'application/octet-stream' },
        body: file,
      });
      // Store the storage key in certificateFileUrl; we'll render via presigned GET later
      setFormData((prev) => ({ ...prev, certificateFileUrl: presign.key }));
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-blue-600" size={32} />
            Company Certifications
          </h1>
          <p className="text-gray-600 mt-1">Manage company-wide certifications and audits</p>
        </div>
        <button
          onClick={() => { setEditingCert(null); resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Certification
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="expiring_soon">Expiring Soon</option>
          <option value="expired">Expired</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Types</option>
          {certTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : certifications.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Shield size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No certifications found</p>
          </div>
        ) : (
          certifications.map((cert) => {
            const status = getStatusBadge(cert);
            const StatusIcon = status.icon;
            return (
              <div key={cert.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900">{cert.certificationName}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${status.color}`}>
                        <StatusIcon size={16} />
                        {status.label}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">{cert.certificationBody}</p>
                    <p className="text-sm text-gray-500 mt-1">Certificate #: {cert.certificateNumber}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { 
                      setEditingCert(cert); 
                      setFormData({ 
                        certificationType: cert.certificationType,
                        certificationName: cert.certificationName,
                        certificationBody: cert.certificationBody,
                        certificateNumber: cert.certificateNumber,
                        certificateFileUrl: cert.certificateFileUrl || '',
                        issueDate: cert.issueDate.split('T')[0], 
                        expiryDate: cert.expiryDate.split('T')[0], 
                        lastAuditDate: cert.lastAuditDate?.split('T')[0] || '', 
                        nextAuditDate: cert.nextAuditDate?.split('T')[0] || '',
                        scope: cert.scope || '',
                        responsiblePerson: cert.responsible.id,
                        reminderDays: 90,
                        notes: ''
                      }); 
                      setIsModalOpen(true); 
                    }} className="p-2 border rounded hover:bg-gray-50">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(cert.id)} className="p-2 border border-red-300 text-red-600 rounded hover:bg-red-50">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Issue Date</p>
                    <p className="font-medium">{new Date(cert.issueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expiry Date</p>
                    <p className="font-medium">{new Date(cert.expiryDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Responsible</p>
                    <p className="font-medium">{cert.responsible.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Audits</p>
                    <p className="font-medium">{cert._count.audits} completed</p>
                  </div>
                </div>

                {cert.nextAuditDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded">
                    <Calendar size={16} />
                    Next audit scheduled: {new Date(cert.nextAuditDate).toLocaleDateString()}
                  </div>
                )}

                {cert.certificateFileUrl && (
                  <>
                    <button onClick={() => openCertificate(cert.certificateFileUrl)} className="inline-flex items-center gap-2 mt-3 px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">
                      <Shield size={16} />
                      View Certificate
                    </button>
                    <button onClick={() => { setApprovalCert(cert); setApprovalForm({ contactPerson: cert.responsible?.name || '', contactEmail: cert.responsible?.email || '', dueDate: cert.expiryDate?.split('T')[0] || '', expectedDate: '', priority: 'medium' }); setShowApprovalModal(true); }} className="ml-2 inline-flex items-center gap-2 mt-3 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      <Stamp size={16} />
                      Request Approval
                    </button>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">{editingCert ? 'Edit' : 'Add'} Certification</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Type *</label>
                    <select required value={formData.certificationType} onChange={(e) => setFormData({ ...formData, certificationType: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      {certTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Name *</label>
                    <input required type="text" value={formData.certificationName} onChange={(e) => setFormData({ ...formData, certificationName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="ISO 9001:2015" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Body *</label>
                    <input required type="text" value={formData.certificationBody} onChange={(e) => setFormData({ ...formData, certificationBody: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Number *</label>
                    <input required type="text" value={formData.certificateNumber} onChange={(e) => setFormData({ ...formData, certificateNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Issue Date *</label>
                    <input required type="date" value={formData.issueDate} onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Expiry Date *</label>
                    <input required type="date" value={formData.expiryDate} onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Audit</label>
                    <input type="date" value={formData.lastAuditDate} onChange={(e) => setFormData({ ...formData, lastAuditDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Next Audit</label>
                    <input type="date" value={formData.nextAuditDate} onChange={(e) => setFormData({ ...formData, nextAuditDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Certificate File or URL</label>
                    
                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                        isDragging 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected} />
                      
                      {uploading ? (
                        <div className="py-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                          <p className="text-sm text-gray-600">Uploading...</p>
                        </div>
                      ) : uploadedFileName ? (
                        <div className="py-2">
                          <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-medium">{uploadedFileName}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setUploadedFileName(''); setFormData(prev => ({ ...prev, certificateFileUrl: '' })); }}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div className="py-4">
                          <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <p className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Drag and drop</span> your file here, or
                          </p>
                          <button
                            type="button"
                            onClick={handleFilePick}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                          >
                            Browse files
                          </button>
                          <p className="text-xs text-gray-500 mt-3">
                            Allowed: PDF, PNG, JPG, WEBP, DOCX, XLSX, PPTX • Max 20MB
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3">
                      <input type="url" placeholder="Or paste an external URL" value={formData.certificateFileUrl} onChange={(e) => setFormData({ ...formData, certificateFileUrl: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                      <p className="text-xs text-gray-500 mt-1">Tip: You can also paste screenshots directly (Ctrl+V)</p>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Scope</label>
                    <textarea value={formData.scope} onChange={(e) => setFormData({ ...formData, scope: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingCert(null); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {isLoading ? 'Saving...' : editingCert ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showApprovalModal && approvalCert && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-xl font-semibold mb-4">Request Approval for {approvalCert.certificationName}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Approver Name</label>
                <input className="w-full border rounded px-3 py-2" value={approvalForm.contactPerson} onChange={(e)=>setApprovalForm({...approvalForm, contactPerson: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Approver Email</label>
                <input type="email" className="w-full border rounded px-3 py-2" value={approvalForm.contactEmail} onChange={(e)=>setApprovalForm({...approvalForm, contactEmail: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Due Date</label>
                <input type="date" className="w-full border rounded px-3 py-2" value={approvalForm.dueDate} onChange={(e)=>setApprovalForm({...approvalForm, dueDate: e.target.value})} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Expected Date</label>
                <input type="date" className="w-full border rounded px-3 py-2" value={approvalForm.expectedDate} onChange={(e)=>setApprovalForm({...approvalForm, expectedDate: e.target.value})} />
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Priority</label>
                <select className="w-full border rounded px-3 py-2" value={approvalForm.priority} onChange={(e)=>setApprovalForm({...approvalForm, priority: e.target.value as any})}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 border rounded" onClick={()=>setShowApprovalModal(false)}>Cancel</button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={async ()=>{
                try {
                  // Company-level certs aren’t tied to a project, pass 0 as projectId as a convention
                  await createApproval({
                    projectId: 0,
                    approvalType: 'certification',
                    title: `Certification Approval: ${approvalCert.certificationName}`,
                    description: `Approval for ${approvalCert.certificationType} (${approvalCert.certificateNumber || 'N/A'})`,
                    contactPerson: approvalForm.contactPerson || undefined,
                    contactEmail: approvalForm.contactEmail || undefined,
                    dueDate: approvalForm.dueDate || undefined,
                    expectedDate: approvalForm.expectedDate || undefined,
                    priority: approvalForm.priority,
                  });
                  setShowApprovalModal(false);
                  alert('Approval request created');
                } catch (e) {
                  console.error(e);
                  alert('Failed to create approval');
                }
              }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificationsPage;
