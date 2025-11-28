import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { 
  Calendar, 
  Package, 
  PlayCircle, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  TrendingUp
} from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';
import { useProjectContext } from '../../hooks';

interface GeneratePlanPayload {
  projectId: number;
  processFlowId: string;
  quantity: number;
  startDate: string;
  hoursPerDay?: number;
  workingDaysPerWeek?: number;
  strategy?: 'bottleneck' | 'balanced';
}

interface PlanGenerationResult {
  success: boolean;
  planId: string;
  message: string;
  estimatedDays: number;
  bottlenecks: Array<{
    operationName: string;
    severity: string;
  }>;
  validationIssues?: string[];
}

interface ProcessFlow {
  id: string;
  flowName: string;
  description: string | null;
}

export default function MultiProcessPlanPage() {
  const { projectId } = useProjectContext();
  const queryClient = useQueryClient();
  
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1000);
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [hoursPerDay, setHoursPerDay] = useState<number>(8);
  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState<number>(6);
  const [strategy, setStrategy] = useState<'bottleneck' | 'balanced'>('bottleneck');

  // Fetch available process flows
  const { data: flows, isLoading: flowsLoading } = useQuery<ProcessFlow[]>({
    queryKey: ['process-flows', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/process-flows`);
      if (!res.ok) throw new Error('Failed to fetch process flows');
      return res.json();
    },
    enabled: !!projectId
  });

  // Generate plan mutation
  const generatePlan = useMutation<PlanGenerationResult, Error, GeneratePlanPayload>({
    mutationFn: async (payload) => {
      const res = await fetch('/api/auto-planning/generate-multi-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate plan');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-plans', projectId] });
    }
  });

  const handleGenerate = () => {
    if (!projectId || !selectedFlowId) {
      alert('Please select a process flow');
      return;
    }

    generatePlan.mutate({
      projectId: Number(projectId),
      processFlowId: selectedFlowId,
      quantity,
      startDate,
      hoursPerDay,
      workingDaysPerWeek,
      strategy
    });
  };

  if (!projectId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-yellow-900">No Project Context</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Navigate to a project to generate multi-process plans.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Multi-Process Planning" />
      
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Form Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Generate Production Plan
          </h2>
          
          <div className="space-y-4">
            {/* Process Flow Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Process Flow *
              </label>
              {flowsLoading ? (
                <div className="h-10 bg-gray-100 rounded animate-pulse" />
              ) : (
                <select
                  value={selectedFlowId}
                  onChange={(e) => setSelectedFlowId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a process flow</option>
                  {flows?.map((flow) => (
                    <option key={flow.id} value={flow.id}>
                      {flow.flowName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Package className="w-4 h-4 inline mr-1" />
                Total Quantity *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Working Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hours per Day
                </label>
                <input
                  type="number"
                  value={hoursPerDay}
                  onChange={(e) => setHoursPerDay(Number(e.target.value))}
                  min="1"
                  max="24"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Working Days per Week
                </label>
                <input
                  type="number"
                  value={workingDaysPerWeek}
                  onChange={(e) => setWorkingDaysPerWeek(Number(e.target.value))}
                  min="1"
                  max="7"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Strategy */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <TrendingUp className="w-4 h-4 inline mr-1" />
                Planning Strategy
              </label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as 'bottleneck' | 'balanced')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="bottleneck">Bottleneck-Aware (Recommended)</option>
                <option value="balanced">Balanced Load</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {strategy === 'bottleneck'
                  ? 'Focuses on maximizing throughput through identified bottlenecks'
                  : 'Distributes load evenly across all operations'}
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!selectedFlowId || generatePlan.isPending}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              {generatePlan.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Plan...
                </>
              ) : (
                <>
                  <PlayCircle className="w-5 h-5" />
                  Generate Plan
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result Card */}
        {generatePlan.isSuccess && generatePlan.data && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            {generatePlan.data.success ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Plan Generated Successfully
                    </h3>
                    <p className="text-sm text-gray-600">
                      Estimated completion: {generatePlan.data.estimatedDays.toFixed(1)} days
                    </p>
                  </div>
                </div>
                
                {generatePlan.data.bottlenecks.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                    <h4 className="font-medium text-yellow-900 mb-2">
                      Bottlenecks Detected
                    </h4>
                    <ul className="space-y-1">
                      {generatePlan.data.bottlenecks.map((bottleneck, idx) => (
                        <li key={idx} className="text-sm text-yellow-800">
                          • {bottleneck.operationName} ({bottleneck.severity})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-sm text-gray-600 mt-4">
                  Plan ID: <span className="font-mono text-gray-900">{generatePlan.data.planId}</span>
                </p>
              </>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-red-900">Plan Generation Failed</h3>
                  <p className="text-sm text-red-700 mt-1">
                    {generatePlan.data.message}
                  </p>
                  {generatePlan.data.validationIssues && generatePlan.data.validationIssues.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {generatePlan.data.validationIssues.map((issue, idx) => (
                        <li key={idx} className="text-sm text-red-700">• {issue}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Card */}
        {generatePlan.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-red-900">Error</h3>
              <p className="text-sm text-red-700 mt-1">
                {generatePlan.error.message}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
