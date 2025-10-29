import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Shield, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

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

  const fetchCertifications = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('certificationType', typeFilter);

      const res = await fetch(`/api/compliance/company-certifications?${params}`, { credentials: 'include' });
      if (res.ok) setCertifications(await res.json());
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
      const url = editingCert 
        ? `/api/compliance/company-certifications/${editingCert.id}`
        : '/api/compliance/company-certifications';
      const method = editingCert ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingCert(null);
        resetForm();
        fetchCertifications();
      } else {
        alert('Failed to save certification');
      }
    } catch (error) {
      console.error('Error saving certification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this certification?')) return;
    try {
      const res = await fetch(`/api/compliance/company-certifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) fetchCertifications();
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
                  <a href={cert.certificateFileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 px-3 py-2 bg-gray-100 rounded hover:bg-gray-200">
                    <Shield size={16} />
                    View Certificate
                  </a>
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
                    <label className="block text-sm font-medium mb-2">Certificate URL</label>
                    <input type="url" value={formData.certificateFileUrl} onChange={(e) => setFormData({ ...formData, certificateFileUrl: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
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
    </div>
  );
};

export default CertificationsPage;
