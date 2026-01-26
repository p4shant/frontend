import React, { useState, useMemo } from 'react';
import { Check, MoreVertical } from 'lucide-react';
import type { Task } from '../../__tests__/data/mockTasks';
import { getNextAllowedStatuses } from '../../utils/statusValidation';

export interface TaskCardProps {
    id: string;
    taskId: string;
    customerName: string;
    workTitle: string;
    work?: string;
    assignedRole: string;
    status: Task['status'];
    assignedOn: string;
    onClick: () => void;
    onStatusChange?: (taskId: string, newStatus: Task['status']) => void;
    taskNumber?: number;
}

const STATUS_OPTIONS: { value: Task['status']; label: string; color: string; bgColor: string }[] = [
    { value: 'pending', label: 'Pending', color: 'text-yellow-700', bgColor: 'hover:bg-yellow-50' },
    { value: 'in-progress', label: 'In Progress', color: 'text-blue-700', bgColor: 'hover:bg-blue-50' },
    { value: 'completed', label: 'Completed', color: 'text-green-700', bgColor: 'hover:bg-green-50' },
];

export const TaskCard: React.FC<TaskCardProps> = ({
    id,
    taskId: _taskId,
    customerName: _customerName,
    workTitle,
    work,
    assignedRole: _assignedRole,
    status,
    assignedOn,
    onClick,
    onStatusChange,
    taskNumber: _taskNumber,
}) => {
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    // Get allowed next statuses for current task status
    const allowedNextStatuses = useMemo(() => {
        return getNextAllowedStatuses(status);
    }, [status]);

    // Filter status options to only show current status and allowed next statuses
    const availableStatusOptions = useMemo(() => {
        return STATUS_OPTIONS.filter(option =>
            option.value === status || allowedNextStatuses.includes(option.value)
        );
    }, [status, allowedNextStatuses]);

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: '2-digit',
        });
    };

    const handleStatusChange = (newStatus: Task['status']) => {
        if (onStatusChange) {
            onStatusChange(id, newStatus);
        }
        setIsStatusDropdownOpen(false);
    };

    const handleStatusDropdownClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsStatusDropdownOpen(!isStatusDropdownOpen);
    };

    return (
        <div
            onClick={onClick}
            className="bg-panel border border-blue/12 rounded-xl p-3 md:p-3.5 shadow-sm hover:shadow-md hover:border-blue/25 transition-all duration-200 cursor-pointer group active:scale-[0.98]"
        >
            {/* Task Number and Role Badge */}
            {/* <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    {taskNumber !== undefined && (
                        <span className="flex items-center justify-center w-6 h-6 bg-brand/10 text-brand font-bold text-xs rounded-full">
                            {taskNumber}
                        </span>
                    )}
                    <span className="text-[10px] md:text-[11px] font-bold text-text/70 uppercase tracking-wide">
                        {taskId}
                    </span>
                </div>
            </div> */}

            {/* Work Description */}
            <div className="mb-2">
                <p className="text-[10px] text-muted font-semibold uppercase mb-1">Work</p>
                <h4 className="text-xs md:text-sm font-semibold text-text break-words group-hover:text-blue-dark transition-colors">
                    {work || workTitle}
                </h4>
            </div>

            {/* Assigned Date and Action Icon */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-blue/8">
                <div className="flex-1">
                    <p className="text-[10px] md:text-[11px] font-semibold text-muted">
                        Assigned: {formatDate(assignedOn)}
                    </p>
                </div>

                <div className="relative flex-shrink-0">
                    <button
                        onClick={handleStatusDropdownClick}
                        className="p-1.5 hover:bg-text/10 rounded-lg transition-colors text-muted hover:text-text"
                        title="Change status"
                    >
                        <MoreVertical size={14} className="md:w-4 md:h-4" />
                    </button>

                    {/* Status Dropdown Menu */}
                    {isStatusDropdownOpen && availableStatusOptions.length > 0 && (
                        <div
                            className="absolute top-full right-0 mt-1 bg-panel border border-blue/20 rounded-lg shadow-lg z-50 overflow-hidden min-w-[140px]"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {availableStatusOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleStatusChange(option.value)}
                                    disabled={option.value === status}
                                    className={`w-full px-2 py-1.5 text-[10px] md:text-[11px] font-medium text-left transition-colors flex items-center justify-between ${option.bgColor} ${option.color} border-b border-blue/12 last:border-b-0 disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    <span>{option.label}</span>
                                    {status === option.value && <Check size={12} className="flex-shrink-0" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
