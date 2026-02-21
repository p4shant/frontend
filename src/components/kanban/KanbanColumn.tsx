import React from 'react';
import { TaskCard } from './TaskCard';
import type { TaskCardProps } from './TaskCard';
import type { Task } from '../../__tests__/data/mockTasks';

interface KanbanColumnProps {
    title: string;
    status: 'pending' | 'in-progress' | 'completed';
    tasks: TaskCardProps[];
    onTaskClick: (taskId: string) => void;
    onStatusChange?: (taskId: string, newStatus: Task['status']) => void;
    statusColors: Record<string, { bg: string; border: string; icon: string }>;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
    title,
    tasks,
    onTaskClick,
    onStatusChange,
    statusColors,
    status,
}) => {
    const colors = statusColors[status];

    // Define background colors for task list area based on status
    const columnBgColors = {
        'pending': 'bg-amber-50/30',
        'in-progress': 'bg-blue-50/30',
        'completed': 'bg-emerald-50/30',
    };

    const headerBgColors = {
        'pending': 'bg-amber-100/80',
        'in-progress': 'bg-blue-100/80',
        'completed': 'bg-emerald-100/80',
    };

    return (
        <div className="flex flex-col h-full min-h-0 w-full px-0 sm:px-3 md:px-0">
            {/* Column Header */}
            <div className={`${headerBgColors[status]} ${colors.border} border rounded-t-lg p-2.5 sm:p-3 md:p-4 mb-0 backdrop-blur-sm`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`text-xl md:text-2xl ${colors.icon}`}>
                            {status === 'pending' ? '📋' : status === 'in-progress' ? '⚙️' : '✅'}
                        </span>
                        <div>
                            <h3 className="font-bold text-text text-sm md:text-base">{title}</h3>
                            <p className="text-xs text-muted">{tasks.length} tasks</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tasks List */}
            <div className={`flex-1 overflow-y-auto ${columnBgColors[status]} rounded-b-lg p-2.5 sm:p-3 space-y-2.5 min-h-0 border-b border-l border-r ${colors.border}`}>
                {tasks.length === 0 ? (
                    <div className="flex items-center justify-center h-40 text-muted">
                        <p className="text-center text-sm">
                            <span className="block text-2xl mb-2">✨</span>
                            No tasks in {title.toLowerCase()}
                        </p>
                    </div>
                ) : (
                    tasks.map((task) => (
                        <TaskCard
                            key={task.id}
                            {...task}
                            registeredCustomerId={task.registeredCustomerId}
                            work_type={task.work_type}
                            onClick={() => onTaskClick(task.id)}
                            onStatusChange={onStatusChange}
                        />
                    ))
                )}
            </div>
        </div>
    );
};
