import React, { useState, useEffect } from 'react';
import {
  User,
  Users,
  Award,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Edit2,
  Search,
  Filter,
  BarChart3,
  Star,
  Upload,
  FileText,
  Target,
  Zap,
  Shield,
  Eye
} from 'lucide-react';

interface Worker {
  id: string;
  name: string;
  employeeId: string;
  photo?: string;
  department: string;
  role: string;
  email: string;
  phone: string;
  joinedDate: string;
  status: 'active' | 'on_leave' | 'inactive';
  skills: WorkerSkill[];
  certifications: Certification[];
  performanceMetrics: PerformanceMetrics;
  shiftPreferences: ShiftPreference[];
}

interface WorkerSkill {
  id: string;
  skillName: string;
  skillCategory: string;
  level: 'beginner' | 'intermediate' | 'expert';
  yearsOfExperience: number;
  lastAssessed: string;
  verifiedBy?: string;
}

interface Certification {
  id: string;
  name: string;
  issuedBy: string;
  issuedDate: string;
  expiryDate: string;
  certificateUrl?: string;
  status: 'active' | 'expiring_soon' | 'expired';
}

interface PerformanceMetrics {
  productivityScore: number;
  qualityScore: number;
  attendanceRate: number;
  onTimeDelivery: number;
  totalTasksCompleted: number;
  avgTaskCompletionTime: number;
}

interface ShiftPreference {
  dayOfWeek: string;
  preferredShift: 'morning' | 'afternoon' | 'night';
  availability: 'available' | 'partial' | 'unavailable';
}

interface TrainingRecommendation {
  id: string;
  workerId: string;
  workerName: string;
  skillGap: string;
  recommendedTraining: string;
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: string;
  businessImpact: string;
}

export function WorkforceSkillMatrixPage() {
  // Optional project scope: from ?projectId=... or /projects/:id path
  const projectId = (() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const q = sp.get('projectId');
      if (q) return q;
      const m = window.location.pathname.match(/\/projects\/(\d+)/);
      return m?.[1] || '';
    } catch {
      return '';
    }
  })();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [trainingRecommendations, setTrainingRecommendations] = useState<TrainingRecommendation[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterSkillLevel, setFilterSkillLevel] = useState('');
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [showSkillModal, setShowSkillModal] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'matrix'>('cards');

  const [newWorker, setNewWorker] = useState({
    name: '',
    employeeId: '',
    email: '',
    phone: '',
    department: '',
    role: ''
  });

  useEffect(() => {
    fetchWorkers();
    fetchTrainingRecommendations();
  }, []);

  const fetchWorkers = async () => {
    try {
      const qs = projectId ? `?projectId=${projectId}` : '';
      const response = await fetch(`/api/workers${qs}`);
      const data = await response.json();
      setWorkers(data);
    } catch (error) {
      console.error('Failed to fetch workers:', error);
    }
  };

  const fetchTrainingRecommendations = async () => {
    try {
      const qs = projectId ? `?projectId=${projectId}` : '';
      const response = await fetch(`/api/workers/training-recommendations${qs}`);
      const data = await response.json();
      setTrainingRecommendations(data);
    } catch (error) {
      console.error('Failed to fetch training recommendations:', error);
    }
  };

  const handleAddWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWorker)
      });
      
      if (response.ok) {
        await fetchWorkers();
        setShowAddWorkerModal(false);
        setNewWorker({ name: '', employeeId: '', email: '', phone: '', department: '', role: '' });
      }
    } catch (error) {
      console.error('Failed to add worker:', error);
    }
  };

  const getSkillLevelColor = (level: string) => {
    switch (level) {
      case 'expert': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-blue-100 text-blue-800';
      case 'beginner': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCertificationStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'expiring_soon': return 'text-yellow-600';
      case 'expired': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getWorkerStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'on_leave': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredWorkers = workers.filter(worker => {
    const matchesSearch = worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         worker.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = !filterDepartment || worker.department === filterDepartment;
    const matchesSkillLevel = !filterSkillLevel || worker.skills.some(s => s.level === filterSkillLevel);
    
    return matchesSearch && matchesDepartment && matchesSkillLevel;
  });

  const departments = Array.from(new Set(workers.map(w => w.department)));

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Workforce Skill Matrix
          </h1>
          <p className="text-gray-600 mt-1">Comprehensive skill tracking, certifications, and performance management</p>
        </div>
        <button
          onClick={() => setShowAddWorkerModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Worker
        </button>
      </div>

      {/* Statistics Dashboard */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Workers</p>
              <p className="text-2xl font-bold text-gray-900">{workers.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Active</p>
              <p className="text-2xl font-bold text-gray-900">{workers.filter(w => w.status === 'active').length}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Expert Level</p>
              <p className="text-2xl font-bold text-gray-900">
                {workers.reduce((sum, w) => sum + w.skills.filter(s => s.level === 'expert').length, 0)}
              </p>
            </div>
            <Award className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Expiring Certs</p>
              <p className="text-2xl font-bold text-gray-900">
                {workers.reduce((sum, w) => sum + w.certifications.filter(c => c.status === 'expiring_soon').length, 0)}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Avg Performance</p>
              <p className="text-2xl font-bold text-gray-900">
                {workers.length > 0 
                  ? Math.round(workers.reduce((sum, w) => sum + w.performanceMetrics.productivityScore, 0) / workers.length)
                  : 0}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Training Recommendations Banner */}
      {trainingRecommendations.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-start gap-4">
            <Zap className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 mb-2">Training Recommendations</h3>
              <div className="space-y-2">
                {trainingRecommendations.slice(0, 3).map(rec => (
                  <div key={rec.id} className="flex items-center justify-between text-sm">
                    <div>
                      <span className="font-medium">{rec.workerName}</span>
                      <span className="text-gray-600"> • {rec.skillGap}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                      rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {rec.priority} priority
                    </span>
                  </div>
                ))}
              </div>
              {trainingRecommendations.length > 3 && (
                <button className="text-sm text-purple-600 hover:underline mt-2">
                  View all {trainingRecommendations.length} recommendations
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters & View Toggle */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <select
            value={filterSkillLevel}
            onChange={(e) => setFilterSkillLevel(e.target.value)}
            className="border rounded-lg px-3 py-2"
          >
            <option value="">All Skill Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="expert">Expert</option>
          </select>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded ${viewMode === 'cards' ? 'bg-white shadow' : ''}`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded ${viewMode === 'table' ? 'bg-white shadow' : ''}`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1 rounded ${viewMode === 'matrix' ? 'bg-white shadow' : ''}`}
            >
              Matrix
            </button>
          </div>
        </div>
      </div>

      {/* Workers Display */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-3 gap-6">
          {filteredWorkers.length === 0 ? (
            <div className="col-span-3 bg-white rounded-lg shadow p-12 text-center text-gray-500">
              No workers found. Add workers to get started.
            </div>
          ) : (
            filteredWorkers.map(worker => (
              <div key={worker.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
                {/* Worker Card Header */}
                <div className="p-6 border-b">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                      {worker.photo ? (
                        <img src={worker.photo} alt={worker.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        worker.name.split(' ').map(n => n[0]).join('')
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-900 truncate">{worker.name}</h3>
                      <p className="text-sm text-gray-600">{worker.role}</p>
                      <p className="text-xs text-gray-500">ID: {worker.employeeId}</p>
                      <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${getWorkerStatusColor(worker.status)}`}>
                        {worker.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Skills Section */}
                <div className="p-4 border-b">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    Skills ({worker.skills.length})
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {worker.skills.slice(0, 4).map(skill => (
                      <span key={skill.id} className={`px-2 py-1 rounded text-xs ${getSkillLevelColor(skill.level)}`}>
                        {skill.skillName}
                      </span>
                    ))}
                    {worker.skills.length > 4 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        +{worker.skills.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="p-4 border-b">
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Performance
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Productivity</span>
                        <span>{worker.performanceMetrics.productivityScore}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${worker.performanceMetrics.productivityScore}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Quality</span>
                        <span>{worker.performanceMetrics.qualityScore}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div 
                          className="bg-green-600 h-1.5 rounded-full"
                          style={{ width: `${worker.performanceMetrics.qualityScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Certifications */}
                <div className="p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Certifications ({worker.certifications.length})
                  </h4>
                  {worker.certifications.length === 0 ? (
                    <p className="text-xs text-gray-500">No certifications</p>
                  ) : (
                    <div className="space-y-2">
                      {worker.certifications.slice(0, 2).map(cert => (
                        <div key={cert.id} className="flex items-center justify-between text-xs">
                          <span className="truncate flex-1">{cert.name}</span>
                          <span className={getCertificationStatusColor(cert.status)}>
                            {cert.status === 'active' ? <CheckCircle className="w-3 h-3" /> :
                             cert.status === 'expiring_soon' ? <Clock className="w-3 h-3" /> :
                             <AlertTriangle className="w-3 h-3" />}
                          </span>
                        </div>
                      ))}
                      {worker.certifications.length > 2 && (
                        <p className="text-xs text-gray-500">+{worker.certifications.length - 2} more</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4 border-t bg-gray-50 flex gap-2">
                  <button
                    onClick={() => setSelectedWorker(worker)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                  <button
                    className="px-3 py-2 border rounded hover:bg-white flex items-center gap-2 text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Worker Modal */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Plus className="w-6 h-6" />
              Add New Worker
            </h2>
            <form onSubmit={handleAddWorker} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newWorker.name}
                  onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Employee ID *</label>
                <input
                  type="text"
                  required
                  value={newWorker.employeeId}
                  onChange={(e) => setNewWorker({ ...newWorker, employeeId: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newWorker.email}
                    onChange={(e) => setNewWorker({ ...newWorker, email: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="tel"
                    value={newWorker.phone}
                    onChange={(e) => setNewWorker({ ...newWorker, phone: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Department *</label>
                  <input
                    type="text"
                    required
                    value={newWorker.department}
                    onChange={(e) => setNewWorker({ ...newWorker, department: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role *</label>
                  <input
                    type="text"
                    required
                    value={newWorker.role}
                    onChange={(e) => setNewWorker({ ...newWorker, role: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="flex-1 border px-4 py-2 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Add Worker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
