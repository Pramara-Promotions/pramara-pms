import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, FlaskConical, CheckCircle, XCircle, Clock, FileText, Download } from 'lucide-react';

interface LabTest {
  id: string;
  projectId: string | null;
  project: { id: string; name: string } | null;
  projectComplianceId: string | null;
  testType: string;
  testName: string;
  labName: string;
  labAccreditation: string | null;
  sampleCode: string;
  testStandard: string;
  testDate: string | null;
  reportDate: string | null;
  reportNumber: string | null;
  reportFileUrl: string | null;
  result: string;
  resultDetails: string | null;
  cost: number | null;
  retestDueDate: string | null;
  createdAt: string;
}

const LabTestsPage = () => {
  const [tests, setTests] = useState<LabTest[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<LabTest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resultFilter, setResultFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  const [formData, setFormData] = useState({
    projectId: '',
    testType: 'physical',
    testName: '',
    labName: '',
    labAccreditation: '',
    sampleCode: '',
    testStandard: '',
    testDate: '',
    reportDate: '',
    reportNumber: '',
    reportFileUrl: '',
    result: 'pending',
    resultDetails: '',
    cost: 0,
    retestDueDate: '',
    notes: '',
  });

  const testTypes = [
    { value: 'physical', label: 'Physical Testing' },
    { value: 'chemical', label: 'Chemical Testing' },
    { value: 'colorfastness', label: 'Colorfastness' },
    { value: 'safety', label: 'Safety Testing' },
    { value: 'environmental', label: 'Environmental' },
    { value: 'durability', label: 'Durability' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchProjects();
    fetchTests();
  }, [resultFilter, projectFilter]);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?status=active', { credentials: 'include' });
      if (res.ok) setProjects(await res.json());
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchTests = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (resultFilter) params.append('result', resultFilter);
      if (projectFilter) params.append('projectId', projectFilter);

      const res = await fetch(`/api/compliance/lab-tests?${params}`, { credentials: 'include' });
      if (res.ok) setTests(await res.json());
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const url = editingTest 
        ? `/api/compliance/lab-tests/${editingTest.id}`
        : '/api/compliance/lab-tests';
      const method = editingTest ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingTest(null);
        resetForm();
        fetchTests();
      } else {
        alert('Failed to save test');
      }
    } catch (error) {
      console.error('Error saving test:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lab test?')) return;
    try {
      const res = await fetch(`/api/compliance/lab-tests/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) fetchTests();
    } catch (error) {
      console.error('Error deleting test:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      testType: 'physical',
      testName: '',
      labName: '',
      labAccreditation: '',
      sampleCode: '',
      testStandard: '',
      testDate: '',
      reportDate: '',
      reportNumber: '',
      reportFileUrl: '',
      result: 'pending',
      resultDetails: '',
      cost: 0,
      retestDueDate: '',
      notes: '',
    });
  };

  const getResultBadge = (result: string) => {
    switch (result) {
      case 'pass': return { color: 'bg-green-100 text-green-800', label: 'PASS', icon: CheckCircle };
      case 'fail': return { color: 'bg-red-100 text-red-800', label: 'FAIL', icon: XCircle };
      case 'conditional': return { color: 'bg-yellow-100 text-yellow-800', label: 'CONDITIONAL', icon: Clock };
      default: return { color: 'bg-gray-100 text-gray-800', label: 'PENDING', icon: Clock };
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <FlaskConical className="text-blue-600" size={32} />
            Lab Tests
          </h1>
          <p className="text-gray-600 mt-1">Track product testing and lab results</p>
        </div>
        <button
          onClick={() => { setEditingTest(null); resetForm(); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus size={20} />
          Add Test
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <select
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Results</option>
          <option value="pending">Pending</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
          <option value="conditional">Conditional</option>
        </select>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : tests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FlaskConical size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No lab tests found</p>
          </div>
        ) : (
          tests.map((test) => {
            const result = getResultBadge(test.result);
            const ResultIcon = result.icon;
            return (
              <div key={test.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-xl font-bold text-gray-900">{test.testName}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${result.color}`}>
                        <ResultIcon size={16} />
                        {result.label}
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                        {test.testType}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-1">{test.labName}</p>
                    {test.project && (
                      <p className="text-sm text-gray-500 mt-1">Project: {test.project.name}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { 
                      setEditingTest(test); 
                      setFormData({
                        projectId: test.projectId || '',
                        testType: test.testType,
                        testName: test.testName,
                        labName: test.labName,
                        labAccreditation: test.labAccreditation || '',
                        sampleCode: test.sampleCode,
                        testStandard: test.testStandard,
                        testDate: test.testDate?.split('T')[0] || '',
                        reportDate: test.reportDate?.split('T')[0] || '',
                        reportNumber: test.reportNumber || '',
                        reportFileUrl: test.reportFileUrl || '',
                        result: test.result,
                        resultDetails: test.resultDetails || '',
                        cost: test.cost || 0,
                        retestDueDate: test.retestDueDate?.split('T')[0] || '',
                        notes: ''
                      }); 
                      setIsModalOpen(true); 
                    }} className="p-2 border rounded hover:bg-gray-50">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(test.id)} className="p-2 border border-red-300 text-red-600 rounded hover:bg-red-50">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Sample Code</p>
                    <p className="font-medium">{test.sampleCode}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Standard</p>
                    <p className="font-medium">{test.testStandard}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Test Date</p>
                    <p className="font-medium">{test.testDate ? new Date(test.testDate).toLocaleDateString() : '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Report Date</p>
                    <p className="font-medium">{test.reportDate ? new Date(test.reportDate).toLocaleDateString() : '-'}</p>
                  </div>
                </div>

                {test.reportNumber && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">Report Number</p>
                    <p className="font-medium">{test.reportNumber}</p>
                  </div>
                )}

                {test.labAccreditation && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded mb-4">
                    <FileText size={16} />
                    Lab Accreditation: {test.labAccreditation}
                  </div>
                )}

                {test.resultDetails && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Result Details:</p>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{test.resultDetails}</p>
                  </div>
                )}

                <div className="flex gap-3 items-center">
                  {test.reportFileUrl && (
                    <a href={test.reportFileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                      <Download size={16} />
                      Download Report
                    </a>
                  )}
                  {test.cost && (
                    <span className="text-sm text-gray-600">
                      Cost: ${test.cost.toLocaleString()}
                    </span>
                  )}
                  {test.retestDueDate && (
                    <span className="text-sm text-orange-600 flex items-center gap-1">
                      <Clock size={14} />
                      Retest Due: {new Date(test.retestDueDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">{editingTest ? 'Edit' : 'Add'} Lab Test</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Project (Optional)</label>
                    <select value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="">None</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Test Type *</label>
                    <select required value={formData.testType} onChange={(e) => setFormData({ ...formData, testType: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      {testTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Result *</label>
                    <select required value={formData.result} onChange={(e) => setFormData({ ...formData, result: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="pending">Pending</option>
                      <option value="pass">Pass</option>
                      <option value="fail">Fail</option>
                      <option value="conditional">Conditional</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Test Name *</label>
                    <input required type="text" value={formData.testName} onChange={(e) => setFormData({ ...formData, testName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Tensile Strength Test" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Lab Name *</label>
                    <input required type="text" value={formData.labName} onChange={(e) => setFormData({ ...formData, labName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Lab Accreditation</label>
                    <input type="text" value={formData.labAccreditation} onChange={(e) => setFormData({ ...formData, labAccreditation: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="ISO 17025" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Sample Code *</label>
                    <input required type="text" value={formData.sampleCode} onChange={(e) => setFormData({ ...formData, sampleCode: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Test Standard *</label>
                    <input required type="text" value={formData.testStandard} onChange={(e) => setFormData({ ...formData, testStandard: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="ASTM D5034" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Test Date</label>
                    <input type="date" value={formData.testDate} onChange={(e) => setFormData({ ...formData, testDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Report Date</label>
                    <input type="date" value={formData.reportDate} onChange={(e) => setFormData({ ...formData, reportDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Report Number</label>
                    <input type="text" value={formData.reportNumber} onChange={(e) => setFormData({ ...formData, reportNumber: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Cost</label>
                    <input type="number" step="0.01" value={formData.cost} onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Report URL</label>
                    <input type="url" value={formData.reportFileUrl} onChange={(e) => setFormData({ ...formData, reportFileUrl: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Retest Due Date (if conditional)</label>
                    <input type="date" value={formData.retestDueDate} onChange={(e) => setFormData({ ...formData, retestDueDate: e.target.value })} className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">Result Details</label>
                    <textarea value={formData.resultDetails} onChange={(e) => setFormData({ ...formData, resultDetails: e.target.value })} className="w-full px-3 py-2 border rounded-lg" rows={3} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => { setIsModalOpen(false); setEditingTest(null); }} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    {isLoading ? 'Saving...' : editingTest ? 'Update' : 'Create'}
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

export default LabTestsPage;
