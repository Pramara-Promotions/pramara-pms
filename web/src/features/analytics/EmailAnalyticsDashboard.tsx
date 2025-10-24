// web/src/features/analytics/EmailAnalyticsDashboard.tsx
// Email Analytics Dashboard with charts and metrics

import { useState, useEffect } from 'react';

interface AnalyticsSummary {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

interface TemplatePerformance {
  template: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
}

interface DailyMetric {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
}

interface DashboardData {
  summary: AnalyticsSummary;
  byTemplate: TemplatePerformance[];
  byDay: DailyMetric[];
}

export default function EmailAnalyticsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchDashboard();
  }, [days]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const res = await fetch(`/api/email-analytics/dashboard?${params}`, {
        credentials: 'include',
      });
      const result = await res.json();
      
      setData(result);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Email Analytics
          </h1>
          <p className="text-gray-600">
            Track email performance and engagement metrics
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setDays(7)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              days === 7
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDays(30)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              days === 30
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Last 30 Days
          </button>
          <button
            onClick={() => setDays(90)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              days === 90
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Last 90 Days
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : !data ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No data available</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Total Sent</p>
                  <span className="text-2xl">📧</span>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {data.summary.totalSent.toLocaleString()}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Open Rate</p>
                  <span className="text-2xl">👀</span>
                </div>
                <p className="text-3xl font-bold text-blue-600">
                  {formatPercent(data.summary.openRate)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {data.summary.totalOpened.toLocaleString()} opens
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Click Rate</p>
                  <span className="text-2xl">🖱️</span>
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {formatPercent(data.summary.clickRate)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {data.summary.totalClicked.toLocaleString()} clicks
                </p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600">Bounce Rate</p>
                  <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-3xl font-bold text-red-600">
                  {formatPercent(data.summary.bounceRate)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {data.summary.totalBounced.toLocaleString()} bounces
                </p>
              </div>
            </div>

            {/* Template Performance Table */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  Performance by Template
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Template
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Opened
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Open Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clicked
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Click Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bounced
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.byTemplate.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                          No template data available
                        </td>
                      </tr>
                    ) : (
                      data.byTemplate.map((template, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {template.template || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {template.sent.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {template.opened.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1 max-w-[100px] bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${template.openRate * 100}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-900">
                                {formatPercent(template.openRate)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {template.clicked.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1 max-w-[100px] bg-gray-200 rounded-full h-2 mr-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full"
                                  style={{ width: `${template.clickRate * 100}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-900">
                                {formatPercent(template.clickRate)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            {template.bounced.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Engagement Trends Chart */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-xl font-bold text-gray-900">
                  Engagement Trends
                </h2>
              </div>
              <div className="p-6">
                {data.byDay.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No trend data available
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Simple bar chart representation */}
                    {data.byDay.map((day, idx) => {
                      const maxValue = Math.max(
                        ...data.byDay.map((d) => d.sent)
                      );
                      const sentPercent = (day.sent / maxValue) * 100;
                      const openPercent = day.sent > 0 ? (day.opened / day.sent) * sentPercent : 0;
                      const clickPercent = day.sent > 0 ? (day.clicked / day.sent) * sentPercent : 0;

                      return (
                        <div key={idx} className="flex items-center gap-4">
                          <div className="w-24 text-sm text-gray-600">
                            {new Date(day.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="flex-1">
                            <div className="flex gap-1 h-8">
                              <div
                                className="bg-gray-300 rounded flex items-center justify-center text-xs text-gray-700"
                                style={{ width: `${sentPercent}%` }}
                                title={`${day.sent} sent`}
                              >
                                {day.sent > 0 && day.sent}
                              </div>
                            </div>
                            <div className="flex gap-1 h-4 mt-1">
                              <div
                                className="bg-blue-500 rounded"
                                style={{ width: `${openPercent}%` }}
                                title={`${day.opened} opened`}
                              />
                              <div
                                className="bg-green-500 rounded"
                                style={{ width: `${clickPercent}%` }}
                                title={`${day.clicked} clicked`}
                              />
                            </div>
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-blue-600">{day.opened} 👀</span>
                            <span className="text-green-600">{day.clicked} 🖱️</span>
                            {day.bounced > 0 && (
                              <span className="text-red-600">{day.bounced} ⚠️</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
