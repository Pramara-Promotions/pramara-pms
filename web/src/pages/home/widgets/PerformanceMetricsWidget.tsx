// Performance Metrics Widget
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Activity } from 'lucide-react';
import { WidgetProps } from '../types';
import { WidgetWrapper, WidgetLoading, WidgetError, WidgetEmpty } from '../components/WidgetWrapper';
import { http } from '../../../lib/http';

type MetricData = {
  label: string;
  value: number;
  change: number; // Percentage change
  trend: 'up' | 'down' | 'neutral';
  unit?: string;
};

const PerformanceMetricsWidget: React.FC<WidgetProps> = ({ config, onUpdate, onRemove }) => {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await http('/api/dashboard/performance-metrics');
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const data = await res.json();
      setMetrics(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
      // Mock data for demo
      setMetrics([
        { label: 'Tasks Completed', value: 24, change: 12, trend: 'up', unit: '' },
        { label: 'On-Time Delivery', value: 94, change: 3, trend: 'up', unit: '%' },
        { label: 'Team Velocity', value: 48, change: -5, trend: 'down', unit: 'pts' },
        { label: 'Quality Score', value: 87, change: 8, trend: 'up', unit: '%' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return { icon: TrendingUp, color: 'text-green-600 dark:text-green-400' };
      case 'down':
        return { icon: TrendingDown, color: 'text-red-600 dark:text-red-400' };
      default:
        return { icon: Activity, color: 'text-gray-600 dark:text-gray-400' };
    }
  };

  return (
    <WidgetWrapper
      config={config}
      onRefresh={fetchMetrics}
      onRemove={onRemove}
      allowRefresh
      allowRemove
    >
      {loading ? (
        <WidgetLoading message="Loading metrics..." />
      ) : error && metrics.length === 0 ? (
        <WidgetError message={error} onRetry={fetchMetrics} />
      ) : metrics.length === 0 ? (
        <WidgetEmpty
          icon={BarChart3}
          title="No metrics yet"
          message="Performance metrics will appear here once you start tracking."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 p-3">
          {metrics.map((metric, index) => {
            const { icon: TrendIcon, color } = getTrendIcon(metric.trend);
            return (
              <div
                key={index}
                className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                {/* Label */}
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {metric.label}
                </p>

                {/* Value */}
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metric.value}
                  </span>
                  {metric.unit && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {metric.unit}
                    </span>
                  )}
                </div>

                {/* Trend */}
                <div className={`flex items-center gap-1 text-xs ${color}`}>
                  <TrendIcon className="h-3 w-3" />
                  <span className="font-medium">
                    {metric.change > 0 ? '+' : ''}
                    {metric.change}%
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">vs last week</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetWrapper>
  );
};

export default PerformanceMetricsWidget;
