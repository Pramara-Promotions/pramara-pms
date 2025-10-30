import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, Clock, FileText, Package, Beaker, Plus } from 'lucide-react';
import { getComplianceSummary, listComplianceRecords } from '../../lib/services/compliance';

interface DashboardStats {
  expiringCertifications: number;
  projectCompliance: { status: string; _count: number }[];
  pendingLabTests: number;
  unverifiedMaterials: number;
  activeReminders: number;
}

interface CompanyCertification {
  id: string;
  certificationType: string;
  certificationName: string;
  expiryDate: string;
  status: string;
  responsible: { name: string };
}

interface ProjectCompliance {
  id: string;
  complianceName: string;
  status: string;
  priority: string;
  requiredBy: string | null;
  blocksProduction: boolean;
  blocksShipment: boolean;
  project: { code: string; name: string };
}

const ComplianceDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expiringSoon, setExpiringSoon] = useState<CompanyCertification[]>([]);
  const [projectCompliance, setProjectCompliance] = useState<ProjectCompliance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // For now keeping fetch calls as compliance service doesn't have dashboard methods yet
      // These can be migrated when backend creates dedicated dashboard endpoint
      const [statsRes, certsRes, complianceRes] = await Promise.all([
        fetch('/api/compliance/dashboard', { credentials: 'include' }),
        fetch('/api/compliance/company-certifications?status=active', { credentials: 'include' }),
        fetch('/api/compliance/project-compliance', { credentials: 'include' }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (certsRes.ok) {
        const certs = await certsRes.json();
        const expiring = certs.filter((c: CompanyCertification) => {
          const daysUntil = (new Date(c.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
          return daysUntil <= 90 && daysUntil > 0;
        });
        setExpiringSoon(expiring);
      }
      if (complianceRes.ok) setProjectCompliance(await complianceRes.json());
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      alert('Failed to load compliance dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      pending: 'bg-yellow-100 text-yellow-800',
      blocked: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      critical: 'text-red-600',
      high: 'text-orange-600',
      medium: 'text-yellow-600',
      low: 'text-gray-600',
    };
    return colors[priority] || 'text-gray-600';
  };

  if (isLoading) {
    return <div className="p-6 text-center">Loading compliance dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-blue-600" size={32} />
            Compliance Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Manage certifications, requirements, and compliance tracking</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.href = '/compliance/certifications'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} className="inline mr-2" />
            Add Certification
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Expiring Soon</p>
              <p className="text-3xl font-bold text-red-700 mt-2">{stats?.expiringCertifications || 0}</p>
              <p className="text-xs text-red-600 mt-1">Within 90 days</p>
            </div>
            <AlertTriangle className="text-red-400" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Pending Tests</p>
              <p className="text-3xl font-bold text-blue-700 mt-2">{stats?.pendingLabTests || 0}</p>
              <p className="text-xs text-blue-600 mt-1">Lab tests</p>
            </div>
            <Beaker className="text-blue-400" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">Unverified</p>
              <p className="text-3xl font-bold text-yellow-700 mt-2">{stats?.unverifiedMaterials || 0}</p>
              <p className="text-xs text-yellow-600 mt-1">Materials</p>
            </div>
            <Package className="text-yellow-400" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Active Reminders</p>
              <p className="text-3xl font-bold text-purple-700 mt-2">{stats?.activeReminders || 0}</p>
              <p className="text-xs text-purple-600 mt-1">Due tasks</p>
            </div>
            <Clock className="text-purple-400" size={40} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Completed</p>
              <p className="text-3xl font-bold text-green-700 mt-2">
                {stats?.projectCompliance.find(s => s.status === 'completed')?._count || 0}
              </p>
              <p className="text-xs text-green-600 mt-1">Requirements</p>
            </div>
            <CheckCircle className="text-green-400" size={40} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.href = '/compliance/certifications'}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <Shield className="text-blue-600 mx-auto mb-2" size={32} />
            <p className="text-sm font-medium text-gray-900">Company Certifications</p>
          </button>
          <button
            onClick={() => window.location.href = '/compliance/projects'}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
          >
            <FileText className="text-green-600 mx-auto mb-2" size={32} />
            <p className="text-sm font-medium text-gray-900">Project Compliance</p>
          </button>
          <button
            onClick={() => window.location.href = '/compliance/materials'}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
          >
            <Package className="text-purple-600 mx-auto mb-2" size={32} />
            <p className="text-sm font-medium text-gray-900">Material Compliance</p>
          </button>
          <button
            onClick={() => window.location.href = '/compliance/lab-tests'}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors"
          >
            <Beaker className="text-orange-600 mx-auto mb-2" size={32} />
            <p className="text-sm font-medium text-gray-900">Lab Tests</p>
          </button>
        </div>
      </div>

      {/* Expiring Certifications */}
      {expiringSoon.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="text-red-600" size={24} />
              Certifications Expiring Soon
            </h2>
          </div>
          <div className="divide-y divide-gray-200">
            {expiringSoon.map((cert) => {
              const daysUntil = Math.ceil((new Date(cert.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              return (
                <div key={cert.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{cert.certificationName}</h3>
                      <p className="text-sm text-gray-600 mt-1">{cert.certificationType}</p>
                      <p className="text-sm text-gray-500 mt-1">Responsible: {cert.responsible.name}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        daysUntil <= 30 ? 'bg-red-100 text-red-800' :
                        daysUntil <= 60 ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {daysUntil} days left
                      </span>
                      <p className="text-xs text-gray-500 mt-2">
                        Expires: {new Date(cert.expiryDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Project Compliance Overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Recent Project Compliance</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {projectCompliance.slice(0, 10).map((item) => (
            <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">{item.complianceName}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </span>
                    {item.blocksProduction && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                        Blocks Production
                      </span>
                    )}
                    {item.blocksShipment && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                        Blocks Shipment
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {item.project.code} - {item.project.name}
                  </p>
                  {item.requiredBy && (
                    <p className="text-sm text-gray-500 mt-1">
                      Required by: {new Date(item.requiredBy).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className={`text-right font-semibold ${getPriorityColor(item.priority)}`}>
                  {item.priority.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
          {projectCompliance.length === 0 && (
            <div className="px-6 py-12 text-center text-gray-500">
              No project compliance records found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplianceDashboard;
