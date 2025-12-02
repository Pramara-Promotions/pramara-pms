import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Zap,
  RefreshCw
} from 'lucide-react';
import { PageHeader } from '../../components/PageHeader';

interface LoadBalancingOpportunity {
  id: string;
  opportunityType: string;
  title: string;
  description: string;
  currentBottleneck: string | null;
  proposedChanges: Array<{
    detailId: string;
    field: string;
    currentValue: any;
    proposedValue: any;
    reason: string;
    alternativeName?: string;
  }>;
  estimatedTimeSaved: number | null;
  estimatedCostSaved: number | null;
  riskLevel: string;
  status: string;
  confidence: number;
  priority: number;
  createdAt: Date;
  expiresAt: Date | null;
  ResourceAvailabilityEvent: {
    resourceType: string;
    resourceName: string;
    eventType: string;
  } | null;
}

interface OpportunitiesData {
  opportunities: LoadBalancingOpportunity[];
  count: number;
  summary: {
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
}

interface LoadBalancingDashboardProps {
  planId: string;
}

export default function LoadBalancingDashboard({ planId }: LoadBalancingDashboardProps) {
  const queryClient = useQueryClient();

  // Fetch opportunities
  const { data, isLoading, refetch } = useQuery<OpportunitiesData>({
    queryKey: ['load-balancing-opportunities', planId],
    queryFn: async () => {
      // Use the general opportunities endpoint with status filter
      const res = await fetch(`/api/load-balancing/opportunities?status=pending&limit=50`);
      if (!res.ok) throw new Error('Failed to fetch opportunities');
      const result = await res.json();

      // Transform to match expected format
      return {
        opportunities: result.opportunities || [],
        count: result.count || 0,
        summary: {
          highPriority: result.opportunities?.filter((o: any) => o.priority >= 8).length || 0,
          mediumPriority: result.opportunities?.filter((o: any) => o.priority >= 5 && o.priority < 8).length || 0,
          lowPriority: result.opportunities?.filter((o: any) => o.priority < 5).length || 0,
        },
      };
    },
    enabled: !!planId,
    refetchInterval: 60000 // Refresh every minute
  });

  // Accept opportunity mutation
  const acceptOpportunity = useMutation({
    mutationFn: async ({ opportunityId, decisionNote }: { opportunityId: string; decisionNote: string }) => {
      const res = await fetch(`/api/load-balancing/opportunities/${opportunityId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionNote })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to accept opportunity');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['load-balancing-opportunities', planId] });
      queryClient.invalidateQueries({ queryKey: ['plan-operations', planId] });
      queryClient.invalidateQueries({ queryKey: ['auto-planning-plans'] });
    }
  });

  // Reject opportunity mutation
  const rejectOpportunity = useMutation({
    mutationFn: async ({ opportunityId, decisionNote }: { opportunityId: string; decisionNote: string }) => {
      const res = await fetch(`/api/load-balancing/opportunities/${opportunityId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisionNote })
      });
      if (!res.ok) throw new Error('Failed to reject opportunity');
      return res.json();
    },
    onSuccess: () => {
      refetch();
    }
  });

  const getOpportunityTypeIcon = (type: string) => {
    switch (type) {
      case 'accelerate_production':
        return <Zap className="w-5 h-5 text-green-600" />;
      case 'reduce_bottleneck':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'optimize_utilization':
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
      case 'gradual_ramp_up':
        return <RefreshCw className="w-5 h-5 text-purple-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'high':
        return 'text-red-700 bg-red-50 border-red-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 8) {
      return <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">High Priority</span>;
    } else if (priority >= 5) {
      return <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">Medium Priority</span>;
    } else {
      return <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">Low Priority</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const sortedOpportunities = [...data.opportunities].sort((a, b) => b.priority - a.priority);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader title="Adaptive Load Balancing" />

      <div className="p-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Opportunities</p>
                <p className="text-2xl font-bold text-gray-900">{data.count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.highPriority}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Medium Priority</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.mediumPriority}</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Low Priority</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary.lowPriority}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Opportunities List */}
        {data.count === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Pending Opportunities
            </h3>
            <p className="text-gray-600">
              Your plan is optimally balanced. New opportunities will appear automatically when resource availability changes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedOpportunities.map((opportunity) => (
              <div key={opportunity.id} className="bg-white border-2 border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    {getOpportunityTypeIcon(opportunity.opportunityType)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {opportunity.title}
                        </h3>
                        {getPriorityBadge(opportunity.priority)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {opportunity.description}
                      </p>
                      {opportunity.ResourceAvailabilityEvent && (
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                            {opportunity.ResourceAvailabilityEvent.eventType}
                          </span>
                          <span>
                            {opportunity.ResourceAvailabilityEvent.resourceName} ({opportunity.ResourceAvailabilityEvent.resourceType})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Impact Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Estimated Time Saved</p>
                    <p className={`text-lg font-bold ${opportunity.estimatedTimeSaved && opportunity.estimatedTimeSaved > 0
                        ? 'text-green-700'
                        : opportunity.estimatedTimeSaved && opportunity.estimatedTimeSaved < 0
                          ? 'text-red-700'
                          : 'text-gray-700'
                      }`}>
                      {opportunity.estimatedTimeSaved !== null
                        ? `${opportunity.estimatedTimeSaved > 0 ? '+' : ''}${opportunity.estimatedTimeSaved.toFixed(1)} days`
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Risk Level</p>
                    <span className={`inline-block text-sm px-3 py-1 rounded-full font-medium border ${getRiskColor(opportunity.riskLevel)}`}>
                      {opportunity.riskLevel}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Confidence</p>
                    <p className="text-lg font-bold text-gray-700">
                      {(opportunity.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>

                {/* Proposed Changes */}
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Proposed Changes ({opportunity.proposedChanges.length}):
                  </p>
                  <div className="space-y-2">
                    {opportunity.proposedChanges.slice(0, 3).map((change, idx) => (
                      <div key={idx} className="text-sm bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-blue-900">
                            {change.field}
                          </span>
                          <span className="text-xs text-blue-600">
                            {String(change.currentValue)} → {String(change.proposedValue)}
                          </span>
                        </div>
                        <p className="text-xs text-blue-700">{change.reason}</p>
                        {change.alternativeName && (
                          <p className="text-xs text-blue-600 mt-1">
                            → {change.alternativeName}
                          </p>
                        )}
                      </div>
                    ))}
                    {opportunity.proposedChanges.length > 3 && (
                      <p className="text-xs text-gray-500 text-center">
                        +{opportunity.proposedChanges.length - 3} more changes
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() =>
                      acceptOpportunity.mutate({
                        opportunityId: opportunity.id,
                        decisionNote: 'Accepted from load balancing dashboard'
                      })
                    }
                    disabled={acceptOpportunity.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Accept & Implement
                  </button>
                  <button
                    onClick={() =>
                      rejectOpportunity.mutate({
                        opportunityId: opportunity.id,
                        decisionNote: 'Rejected from load balancing dashboard'
                      })
                    }
                    disabled={rejectOpportunity.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  <span className="text-xs text-gray-500 ml-auto">
                    Created {new Date(opportunity.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
