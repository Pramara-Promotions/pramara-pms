import { Clock, DollarSign, TrendingDown, AlertCircle } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import ProjectCard from './ProjectCard';

interface ProjectHealth {
    score: number;
    status: 'healthy' | 'at-risk' | 'critical';
    attentionItemCount: number;
    output?: {
        target: number;
        produced: number;
        remaining: number;
        percentComplete: number;
        status: string;
    };
    quality?: {
        totalProduced: number;
        totalGood: number;
        totalRejected: number;
        passRate: number;
        defectRate: number;
        status: string;
    };
    taskProgress?: {
        total: number;
        completed: number;
        inProgress: number;
        percentComplete: number;
    };
}

interface Project {
    id: number;
    code: string;
    name: string;
    description?: string;
    cutoffDate?: string;
    quantity?: number;
    budget?: number;
    budgetSpent?: number;
    health?: ProjectHealth;
}

interface Alert {
    id: string;
    label: string;
    icon: typeof Clock;
    color: string;
    bgColor: string;
    actionUrl: string;
}

interface ProjectAttentionCardProps {
    project: Project;
}

export default function ProjectAttentionCard({ project }: ProjectAttentionCardProps) {
    const navigate = useNavigate();

    // Quick alerts - 1-2 words max
    const getAlerts = (): Alert[] => {
        const alerts: Alert[] = [];

        // Timeline Alert
        if (project.cutoffDate) {
            const now = new Date();
            const cutoff = new Date(project.cutoffDate);
            const daysLeft = Math.ceil((cutoff.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            if (daysLeft < 0) {
                alerts.push({
                    id: 'overdue',
                    label: 'Overdue',
                    icon: Clock,
                    color: 'text-red-600',
                    bgColor: 'bg-red-50 border-red-200',
                    actionUrl: `/projects/${project.id}/planning`
                });
            } else if (daysLeft < 14) {
                alerts.push({
                    id: 'deadline',
                    label: 'Deadline Near',
                    icon: Clock,
                    color: 'text-orange-600',
                    bgColor: 'bg-orange-50 border-orange-200',
                    actionUrl: `/projects/${project.id}/planning`
                });
            }
        }

        // Budget Alert
        if (project.budget && project.budgetSpent) {
            const budgetUsed = (project.budgetSpent / project.budget) * 100;
            if (budgetUsed > 90) {
                alerts.push({
                    id: 'budget',
                    label: 'Budget Low',
                    icon: DollarSign,
                    color: 'text-red-600',
                    bgColor: 'bg-red-50 border-red-200',
                    actionUrl: `/projects/${project.id}/finance`
                });
            }
        }

        // Health Alert
        if (project.health) {
            if (project.health.status === 'critical') {
                alerts.push({
                    id: 'health-critical',
                    label: 'Critical',
                    icon: TrendingDown,
                    color: 'text-red-600',
                    bgColor: 'bg-red-50 border-red-200',
                    actionUrl: `/projects/${project.id}/health`
                });
            } else if (project.health.status === 'at-risk') {
                alerts.push({
                    id: 'health-atrisk',
                    label: 'At Risk',
                    icon: AlertCircle,
                    color: 'text-orange-600',
                    bgColor: 'bg-orange-50 border-orange-200',
                    actionUrl: `/projects/${project.id}/health`
                });
            }

            if (project.health.attentionItemCount > 5) {
                alerts.push({
                    id: 'attention',
                    label: `${project.health.attentionItemCount} Issues`,
                    icon: AlertCircle,
                    color: 'text-orange-600',
                    bgColor: 'bg-orange-50 border-orange-200',
                    actionUrl: `/projects/${project.id}/attention`
                });
            }
        }

        return alerts;
    };

    const alerts = getAlerts();

    return (
        <div className="relative group">
            {/* Alert Badges Overlay */}
            {alerts.length > 0 && (
                <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-2">
                    {alerts.map((alert) => (
                        <button
                            key={alert.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate({ to: alert.actionUrl });
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${alert.bgColor} ${alert.color} font-semibold text-xs shadow-sm hover:shadow-md transition-all hover:scale-105`}
                        >
                            <alert.icon className="w-3.5 h-3.5" />
                            {alert.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Original Project Card */}
            <ProjectCard
                project={project}
                onClick={() => navigate({ to: `/projects/${project.id}` })}
            />
        </div>
    );
}
