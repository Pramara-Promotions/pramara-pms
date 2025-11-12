// web/src/components/ContextualTaskReminder.tsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask } from '../lib/services/tasks';
import { createReminder } from '../lib/services/reminders';
import { Bell, CheckSquare, Plus, X } from 'lucide-react';

interface ContextualTaskReminderProps {
    context: {
        module: string; // 'process' | 'operation' | 'workflow' | 'compliance' | etc
        projectId?: number;
        processId?: string;
        operationId?: string;
        flowId?: string;
        stageId?: string;
        contextUrl: string; // URL to navigate back to this exact location
        contextTitle: string; // Human-readable title (e.g., "Cover Cutting - Assembly Workstation 6")
        contextDescription?: string; // Additional context info
    };
    trigger?: 'button' | 'icon'; // How to display the trigger
    size?: 'sm' | 'md' | 'lg';
}

export default function ContextualTaskReminder({
    context,
    trigger = 'button',
    size = 'md'
}: ContextualTaskReminderProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [modalType, setModalType] = useState<'task' | 'reminder' | null>(null);
    const queryClient = useQueryClient();

    const handleOpenModal = (type: 'task' | 'reminder') => {
        setModalType(type);
        setShowMenu(false);
    };

    const sizeClasses = {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base'
    };

    return (
        <>
            <div className="relative inline-block">
                {trigger === 'button' ? (
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className={`${sizeClasses[size]} rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2`}
                    >
                        <Plus className={size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'} />
                        Task/Reminder
                    </button>
                ) : (
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Add Task or Reminder"
                    >
                        <Plus className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </button>
                )}

                {/* Dropdown Menu */}
                {showMenu && (
                    <>
                        <div className="absolute z-20 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg min-w-[160px]">
                            <button
                                onClick={() => handleOpenModal('task')}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700"
                            >
                                <CheckSquare className="h-4 w-4 text-blue-600" />
                                <span>Add Task</span>
                            </button>
                            <button
                                onClick={() => handleOpenModal('reminder')}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                                <Bell className="h-4 w-4 text-orange-600" />
                                <span>Add Reminder</span>
                            </button>
                        </div>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowMenu(false)}
                        />
                    </>
                )}
            </div>

            {/* Task Modal */}
            {modalType === 'task' && (
                <ContextualTaskModal
                    context={context}
                    onClose={() => setModalType(null)}
                    onSuccess={() => {
                        setModalType(null);
                        queryClient.invalidateQueries({ queryKey: ['tasks'] });
                    }}
                />
            )}

            {/* Reminder Modal */}
            {modalType === 'reminder' && (
                <ContextualReminderModal
                    context={context}
                    onClose={() => setModalType(null)}
                    onSuccess={() => {
                        setModalType(null);
                        queryClient.invalidateQueries({ queryKey: ['reminders'] });
                    }}
                />
            )}
        </>
    );
}

// Contextual Task Modal
function ContextualTaskModal({
    context,
    onClose,
    onSuccess
}: {
    context: ContextualTaskReminderProps['context'];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        assignee: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError('Task name is required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const payload = {
                projectId: context.projectId,
                name: formData.name,
                title: formData.name,
                description: formData.description || undefined,
                dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
                priority: formData.priority,
                status: 'todo',
                section: 'Pre_Prod',
                assignee: formData.assignee || undefined,
                // Store context metadata
                tags: [
                    context.module,
                    context.processId || '',
                    context.operationId || '',
                    `url:${context.contextUrl}`
                ].filter(Boolean),
            };

            await createTask(payload);
            onSuccess();
        } catch (err: any) {
            console.error('Error creating task:', err);
            setError(err.message || 'Failed to create task');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Task</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            disabled={loading}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Context Display */}
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                            Task Context:
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-400">
                            {context.contextTitle}
                        </div>
                        {context.contextDescription && (
                            <div className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                                {context.contextDescription}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Task Name *
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                placeholder="What needs to be done?"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                rows={3}
                                placeholder="Additional details..."
                                disabled={loading}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                    Due Date
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.dueDate}
                                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    disabled={loading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                    Priority
                                </label>
                                <select
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    disabled={loading}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Assign To (User ID)
                            </label>
                            <input
                                type="text"
                                value={formData.assignee}
                                onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                placeholder="Optional: assign to someone"
                                disabled={loading}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Task'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

// Contextual Reminder Modal
function ContextualReminderModal({
    context,
    onClose,
    onSuccess
}: {
    context: ContextualTaskReminderProps['context'];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        dueAt: '',
        assignedToId: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title.trim() || !formData.dueAt) {
            setError('Title and due date are required');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Create a rich description with context
            const contextDescription = `${formData.description ? formData.description + '\n\n' : ''}📍 Context: ${context.contextTitle}${context.contextDescription ? '\n' + context.contextDescription : ''}\n🔗 Link: ${context.contextUrl}`;

            const payload = {
                title: formData.title,
                description: contextDescription,
                dueAt: new Date(formData.dueAt).toISOString(),
                assignedToId: formData.assignedToId || undefined,
            };

            await createReminder(payload);
            onSuccess();
        } catch (err: any) {
            console.error('Error creating reminder:', err);
            setError(err.message || 'Failed to create reminder');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Reminder</h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            disabled={loading}
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Context Display */}
                    <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                        <div className="text-sm font-medium text-orange-900 dark:text-orange-300 mb-1">
                            Reminder Context:
                        </div>
                        <div className="text-sm text-orange-700 dark:text-orange-400">
                            {context.contextTitle}
                        </div>
                        {context.contextDescription && (
                            <div className="text-xs text-orange-600 dark:text-orange-500 mt-1">
                                {context.contextDescription}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-red-700 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Reminder Title *
                            </label>
                            <input
                                required
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                placeholder="What to remember?"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Additional Notes
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                rows={3}
                                placeholder="Any additional details..."
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Remind At *
                            </label>
                            <input
                                required
                                type="datetime-local"
                                value={formData.dueAt}
                                onChange={(e) => setFormData({ ...formData, dueAt: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                disabled={loading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                                Remind (User ID)
                            </label>
                            <input
                                type="text"
                                value={formData.assignedToId}
                                onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                placeholder="Optional: remind someone else"
                                disabled={loading}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={loading}
                            >
                                {loading ? 'Creating...' : 'Create Reminder'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
