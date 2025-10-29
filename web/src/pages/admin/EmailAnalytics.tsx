import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Mail, TrendingUp, MousePointer, AlertCircle, Calendar } from 'lucide-react';

interface EmailAnalyticsSummary {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

interface TimelineData {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
}

interface DeliveryStatus {
  sent: number;
  pending: number;
  failed: number;
  bounced: number;
}

interface TopEmail {
  id: string;
  subject: string;
  to: string;
  sentAt: string;
  opened: boolean;
  openCount: number;
  clicked: boolean;
  clickCount: number;
  performance: 'high' | 'medium' | 'low';
}

interface AnalyticsData {
  summary: EmailAnalyticsSummary;
  timeline: TimelineData[];
}

export default function EmailAnalytics() {
  const [dateRange, setDateRange] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus | null>(null);
  const [topEmails, setTopEmails] = useState<TopEmail[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Fetch aggregate analytics
      const analyticsRes = await fetch(`/api/analytics/emails?${params}`, {
        credentials: 'include',
      });

      if (!analyticsRes.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const analyticsData = await analyticsRes.json();
      setAnalytics(analyticsData);

      // Fetch delivery status
      const deliveryRes = await fetch(`/api/analytics/emails/delivery-status?${params}`, {
        credentials: 'include',
      });

      if (deliveryRes.ok) {
        const deliveryData = await deliveryRes.json();
        setDeliveryStatus(deliveryData);
      }

      // Fetch top emails
      const topRes = await fetch(`/api/analytics/emails/top?${params}&limit=10`, {
        credentials: 'include',
      });

      if (topRes.ok) {
        const topData = await topRes.json();
        setTopEmails(topData);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const pieColors = {
    sent: '#10b981',
    pending: '#f59e0b',
    failed: '#ef4444',
    bounced: '#6b7280',
  };

  const deliveryPieData = deliveryStatus
    ? [
        { name: 'Sent', value: deliveryStatus.sent, color: pieColors.sent },
        { name: 'Pending', value: deliveryStatus.pending, color: pieColors.pending },
        { name: 'Failed', value: deliveryStatus.failed, color: pieColors.failed },
        { name: 'Bounced', value: deliveryStatus.bounced, color: pieColors.bounced },
      ].filter((item) => item.value > 0)
    : [];

  const performanceBadge = (performance: string) => {
    switch (performance) {
      case 'high':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            High
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Medium
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-semibold">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Email Analytics</h1>
            <p className="text-gray-600 mt-1">
              Monitor email delivery and engagement metrics
            </p>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(Number(e.target.value) as 7 | 30 | 90)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Summary Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sent</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {analytics.summary.totalSent}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Open Rate</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {analytics.summary.openRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {analytics.summary.totalOpened} opened
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Click Rate</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {analytics.summary.clickRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {analytics.summary.totalClicked} clicked
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <MousePointer className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Bounce Rate</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {analytics.summary.bounceRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {analytics.summary.totalBounced} bounced
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Open Rate Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Open Rate Timeline</h2>
            {analytics && analytics.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="openRate"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Open Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-300 flex items-center justify-center text-gray-400">
                No data available for the selected period
              </div>
            )}
          </div>

          {/* Click Rate Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Click Rate Timeline
            </h2>
            {analytics && analytics.timeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="clickRate"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Click Rate (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-300 flex items-center justify-center text-gray-400">
                No data available for the selected period
              </div>
            )}
          </div>
        </div>

        {/* Delivery Status & Top Emails Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Delivery Status Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Delivery Status</h2>
            {deliveryPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={deliveryPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {deliveryPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-300 flex items-center justify-center text-gray-400">
                No delivery data available
              </div>
            )}
          </div>

          {/* Top Performing Emails */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Top Performing Emails
            </h2>
            {topEmails.length > 0 ? (
              <div className="overflow-auto max-h-300">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-2 font-medium text-gray-600">
                        Subject
                      </th>
                      <th className="text-center py-2 px-2 font-medium text-gray-600">
                        Opens
                      </th>
                      <th className="text-center py-2 px-2 font-medium text-gray-600">
                        Clicks
                      </th>
                      <th className="text-center py-2 px-2 font-medium text-gray-600">
                        Performance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topEmails.map((email) => (
                      <tr key={email.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">
                          <div className="max-w-xs truncate" title={email.subject}>
                            {email.subject}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {email.to}
                          </div>
                        </td>
                        <td className="text-center py-2 px-2">
                          <span
                            className={`font-semibold ${
                              email.opened ? 'text-green-600' : 'text-gray-400'
                            }`}
                          >
                            {email.openCount}
                          </span>
                        </td>
                        <td className="text-center py-2 px-2">
                          <span
                            className={`font-semibold ${
                              email.clicked ? 'text-purple-600' : 'text-gray-400'
                            }`}
                          >
                            {email.clickCount}
                          </span>
                        </td>
                        <td className="text-center py-2 px-2">
                          {performanceBadge(email.performance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-300 flex items-center justify-center text-gray-400">
                No email data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
