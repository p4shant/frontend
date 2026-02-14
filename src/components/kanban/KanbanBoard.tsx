import React, { useState, useEffect } from 'react';
import { KanbanColumn } from './KanbanColumn';
import { TaskDetailModal } from './TaskDetailModal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { tasksAPI } from '../../services/api';
import type { Task } from '../../__tests__/data/mockTasks';
import { canTransitionTo, getTransitionErrorMessage } from '../../utils/statusValidation';

interface KanbanBoardProps {
    tasks?: Task[];
}

const STATUS_CONFIG = {
    pending: {
        bg: 'bg-amber-50',
        border: 'border-amber-300',
        icon: 'text-amber-600',
    },
    'in-progress': {
        bg: 'bg-blue-50',
        border: 'border-blue-300',
        icon: 'text-blue-600',
    },
    completed: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        icon: 'text-emerald-600',
    },
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks: initialTasks = [] }) => {
    const { user, token } = useAuth();
    const { showToast } = useToast();
    const [allTasks, setAllTasks] = useState<Task[]>(initialTasks);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'pending' | 'in-progress' | 'completed'>('pending');
    const [loading, setLoading] = useState(true);
    const [selectedWorkType, setSelectedWorkType] = useState<string>('all');

    // Fetch tasks on mount or when user changes
    useEffect(() => {
        if (!user || !token) {
            setLoading(false);
            return;
        }

        const fetchTasks = async () => {
            setLoading(true);
            try {
                const fetchedTasks = await tasksAPI.getByEmployeeId(user.id, token);
                setAllTasks(fetchedTasks);
            } catch (error) {
                console.error('Failed to fetch tasks:', error);
                showToast('Failed to load tasks', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, [user, token, showToast]);

    // Get unique work types from all tasks
    const uniqueWorkTypes = React.useMemo(() => {
        const workTypes = allTasks.map(task => task.work_type).filter(Boolean);
        return Array.from(new Set(workTypes)).sort();
    }, [allTasks]);

    // Filter tasks by selected work type
    const filteredTasks = React.useMemo(() => {
        if (selectedWorkType === 'all') {
            return allTasks;
        }
        return allTasks.filter(task => task.work_type === selectedWorkType);
    }, [allTasks, selectedWorkType]);

    const getTasksByStatus = (status: Task['status']) => filteredTasks.filter(task => task.status === status);

    const handleTaskClick = (taskId: string) => {
        const task = allTasks.find(t => t.id === taskId);
        if (task) {
            setSelectedTask(task);
            setIsModalOpen(true);
        }
    };

    const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
        if (!token) {
            showToast('Authentication required', 'error');
            return;
        }

        const task = allTasks.find(t => t.id === taskId);
        if (!task) {
            showToast('Task not found', 'error');
            return;
        }

        // Validate status transition
        if (!canTransitionTo(task.status, newStatus)) {
            showToast(getTransitionErrorMessage(task.status, newStatus), 'warning', 6000);
            return;
        }

        // If same status, no need to update
        if (task.status === newStatus) {
            return;
        }

        try {
            // Call API to update status
            const result = await tasksAPI.updateTaskStatus(taskId, newStatus, token);

            if (result.success) {
                // Update local state
                setAllTasks(allTasks.map(t =>
                    t.id === taskId ? { ...t, status: newStatus } : t
                ));

                // Show success toast
                const statusLabels: Record<Task['status'], string> = {
                    'pending': 'Pending',
                    'in-progress': 'In Progress',
                    'completed': 'Completed'
                };
                showToast(`Task moved to ${statusLabels[newStatus]}`, 'success');

                // In mobile view, navigate to the new status column
                if (window.innerWidth < 768) {
                    setActiveTab(newStatus);
                }
            } else {
                // Show error toast with server message
                showToast(result.message || 'Failed to update task status', 'error', 5000);
            }
        } catch (error) {
            console.error('Error updating task status:', error);
            showToast('Network error: Could not update task', 'error');
        } finally {
            // No per-task loading state needed currently
        }
    };

    const pendingTasks = getTasksByStatus('pending');
    const inProgressTasks = getTasksByStatus('in-progress');
    const completedTasks = getTasksByStatus('completed');

    // Format work type for display
    const formatWorkType = (workType: string | undefined) => {
        if (!workType) return '';
        return workType
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center w-full h-full min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue"></div>
                    <p className="text-text-dim text-sm">Loading tasks...</p>
                </div>
            </div>
        );
    }

    // Desktop view - 3 columns (lg and up)
    const DesktopView = () => (
        <div className="hidden lg:flex lg:flex-col flex-1 overflow-hidden gap-3">
            {/* Filter Dropdown */}
            <div className="flex items-center gap-3 px-1">
                <label htmlFor="work-type-filter" className="text-sm font-medium text-text-primary whitespace-nowrap">
                    Filter by Task:
                </label>
                <select
                    id="work-type-filter"
                    value={selectedWorkType}
                    onChange={(e) => setSelectedWorkType(e.target.value)}
                    className="flex-1 max-w-xs px-3 py-2 text-sm border border-border rounded-lg bg-panel text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="all">All Tasks ({allTasks.length})</option>
                    {uniqueWorkTypes.map(workType => {
                        const count = allTasks.filter(t => t.work_type === workType).length;
                        return (
                            <option key={workType} value={workType}>
                                {formatWorkType(workType)} ({count})
                            </option>
                        );
                    })}
                </select>
            </div>

            {/* Kanban Columns */}
            <div className="grid grid-cols-3 gap-4 flex-1 overflow-hidden">
                <KanbanColumn
                    title="Pending"
                    status="pending"
                    tasks={pendingTasks.map((t, index) => ({
                        id: t.id,
                        taskId: t.taskId,
                        customerName: t.customerName,
                        workTitle: t.workTitle,
                        work: t.work,
                        assignedRole: t.assignedRole,
                        status: t.status,
                        assignedOn: t.assignedOn,
                        taskNumber: index + 1,
                        onClick: () => handleTaskClick(t.id),
                    }))}
                    onTaskClick={handleTaskClick}
                    onStatusChange={handleStatusChange}
                    statusColors={STATUS_CONFIG}
                />
                <KanbanColumn
                    title="In Progress"
                    status="in-progress"
                    tasks={inProgressTasks.map((t, index) => ({
                        id: t.id,
                        taskId: t.taskId,
                        customerName: t.customerName,
                        workTitle: t.workTitle,
                        work: t.work,
                        assignedRole: t.assignedRole,
                        status: t.status,
                        assignedOn: t.assignedOn,
                        taskNumber: index + 1,
                        onClick: () => handleTaskClick(t.id),
                    }))}
                    onTaskClick={handleTaskClick}
                    onStatusChange={handleStatusChange}
                    statusColors={STATUS_CONFIG}
                />
                <KanbanColumn
                    title="Completed"
                    status="completed"
                    tasks={completedTasks.map((t, index) => ({
                        id: t.id,
                        taskId: t.taskId,
                        customerName: t.customerName,
                        workTitle: t.workTitle,
                        work: t.work,
                        assignedRole: t.assignedRole,
                        status: t.status,
                        assignedOn: t.assignedOn,
                        taskNumber: index + 1,
                        onClick: () => handleTaskClick(t.id),
                    }))}
                    onTaskClick={handleTaskClick}
                    onStatusChange={handleStatusChange}
                    statusColors={STATUS_CONFIG}
                />
            </div>
        </div>
    );

    // Tablet view - 2 columns visible, 3rd scrollable (md to lg)
    const TabletView = () => (
        <div className="hidden md:flex lg:hidden flex-col flex-1 overflow-hidden gap-3">
            {/* Filter Dropdown */}
            <div className="flex items-center gap-3 px-1">
                <label htmlFor="work-type-filter-tablet" className="text-sm font-medium text-text-primary whitespace-nowrap">
                    Filter:
                </label>
                <select
                    id="work-type-filter-tablet"
                    value={selectedWorkType}
                    onChange={(e) => setSelectedWorkType(e.target.value)}
                    className="flex-1 max-w-sm px-3 py-2 text-sm border border-border rounded-lg bg-panel text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                    <option value="all">All Tasks ({allTasks.length})</option>
                    {uniqueWorkTypes.map(workType => {
                        const count = allTasks.filter(t => t.work_type === workType).length;
                        return (
                            <option key={workType} value={workType}>
                                {formatWorkType(workType)} ({count})
                            </option>
                        );
                    })}
                </select>
            </div>

            {/* Kanban Columns */}
            <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-4 flex-1 overflow-y-hidden">
                <div className="min-w-[48%] snap-start flex-shrink-0">
                    <KanbanColumn
                        title="Pending"
                        status="pending"
                        tasks={pendingTasks.map((t, index) => ({
                            id: t.id,
                            taskId: t.taskId,
                            customerName: t.customerName,
                            workTitle: t.workTitle,
                            work: t.work,
                            assignedRole: t.assignedRole,
                            status: t.status,
                            assignedOn: t.assignedOn,
                            taskNumber: index + 1,
                            onClick: () => handleTaskClick(t.id),
                        }))}
                        onTaskClick={handleTaskClick}
                        onStatusChange={handleStatusChange}
                        statusColors={STATUS_CONFIG}
                    />
                </div>
                <div className="min-w-[48%] snap-start flex-shrink-0">
                    <KanbanColumn
                        title="In Progress"
                        status="in-progress"
                        tasks={inProgressTasks.map((t, index) => ({
                            id: t.id,
                            taskId: t.taskId,
                            customerName: t.customerName,
                            workTitle: t.workTitle,
                            work: t.work,
                            assignedRole: t.assignedRole,
                            status: t.status,
                            assignedOn: t.assignedOn,
                            taskNumber: index + 1,
                            onClick: () => handleTaskClick(t.id),
                        }))}
                        onTaskClick={handleTaskClick}
                        onStatusChange={handleStatusChange}
                        statusColors={STATUS_CONFIG}
                    />
                </div>
                <div className="min-w-[48%] snap-start flex-shrink-0">
                    <KanbanColumn
                        title="Completed"
                        status="completed"
                        tasks={completedTasks.map((t, index) => ({
                            id: t.id,
                            taskId: t.taskId,
                            customerName: t.customerName,
                            workTitle: t.workTitle,
                            work: t.work,
                            assignedRole: t.assignedRole,
                            status: t.status,
                            assignedOn: t.assignedOn,
                            taskNumber: index + 1,
                            onClick: () => handleTaskClick(t.id),
                        }))}
                        onTaskClick={handleTaskClick}
                        onStatusChange={handleStatusChange}
                        statusColors={STATUS_CONFIG}
                    />
                </div>
            </div>
        </div>
    );

    // Mobile view - Horizontal Scrollable Columns
    const MobileView = () => {
        const scrollContainerRef = React.useRef<HTMLDivElement>(null);
        const isScrollingRef = React.useRef(false);

        const scrollToColumn = (index: number) => {
            if (scrollContainerRef.current) {
                isScrollingRef.current = true;

                // Use requestAnimationFrame to ensure the DOM has rendered
                requestAnimationFrame(() => {
                    if (scrollContainerRef.current) {
                        const containerWidth = scrollContainerRef.current.clientWidth;
                        scrollContainerRef.current.scrollTo({
                            left: containerWidth * index,
                            behavior: 'smooth'
                        });

                        // Reset the flag after scroll completes
                        setTimeout(() => {
                            isScrollingRef.current = false;
                        }, 500);
                    }
                });
            }
        };

        const handleScroll = () => {
            // Only update activeTab if the user is scrolling manually, not programmatically
            if (!isScrollingRef.current && scrollContainerRef.current) {
                const container = scrollContainerRef.current;
                const containerWidth = container.clientWidth;
                const scrollPosition = container.scrollLeft;
                const index = Math.round(scrollPosition / containerWidth);

                const statusMap: ('pending' | 'in-progress' | 'completed')[] = ['pending', 'in-progress', 'completed'];
                if (statusMap[index]) {
                    setActiveTab(statusMap[index]);
                }
            }
        };

        // Auto-scroll to active tab when it changes
        useEffect(() => {
            const statusMap: ('pending' | 'in-progress' | 'completed')[] = ['pending', 'in-progress', 'completed'];
            const tabIndex = statusMap.indexOf(activeTab);
            if (tabIndex !== -1) {
                scrollToColumn(tabIndex);
            }
        }, [activeTab]);

        return (
            <div className="md:hidden flex flex-col w-full overflow-hidden flex-1">
                {/* Filter Dropdown - Mobile */}
                <div className="flex items-center gap-2 px-2 py-2 bg-transparent flex-shrink-0">
                    <label htmlFor="work-type-filter-mobile" className="text-xs font-medium text-text-primary whitespace-nowrap">
                        Filter:
                    </label>
                    <select
                        id="work-type-filter-mobile"
                        value={selectedWorkType}
                        onChange={(e) => setSelectedWorkType(e.target.value)}
                        className="flex-1 px-2 py-1.5 text-xs border border-border rounded-lg bg-panel text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">All Tasks ({allTasks.length})</option>
                        {uniqueWorkTypes.map(workType => {
                            const count = allTasks.filter(t => t.work_type === workType).length;
                            return (
                                <option key={workType} value={workType}>
                                    {formatWorkType(workType)} ({count})
                                </option>
                            );
                        })}
                    </select>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-1 px-0 py-2 bg-transparent flex-shrink-0">
                    <button
                        onClick={() => {
                            setActiveTab('pending');
                            scrollToColumn(0);
                        }}
                        className={`flex-1 px-1 py-2 rounded-lg text-xs font-semibold transition-all flex flex-col items-center justify-center min-h-[50px] ${activeTab === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-sm'
                            : 'bg-panel/50 text-muted border border-transparent'
                            }`}
                    >
                        <span className="text-lg mb-0.5">📋</span>
                        <span className="text-[10px] leading-tight">Pending</span>
                        <span className="text-[9px] opacity-70 mt-0.5">({pendingTasks.length})</span>
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('in-progress');
                            scrollToColumn(1);
                        }}
                        className={`flex-1 px-1 py-2 rounded-lg text-xs font-semibold transition-all flex flex-col items-center justify-center min-h-[50px] ${activeTab === 'in-progress'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300 shadow-sm'
                            : 'bg-panel/50 text-muted border border-transparent'
                            }`}
                    >
                        <span className="text-lg mb-0.5">⚙️</span>
                        <span className="text-[10px] leading-tight">In Progress</span>
                        <span className="text-[9px] opacity-70 mt-0.5">({inProgressTasks.length})</span>
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('completed');
                            scrollToColumn(2);
                        }}
                        className={`flex-1 px-1 py-2 rounded-lg text-xs font-semibold transition-all flex flex-col items-center justify-center min-h-[50px] ${activeTab === 'completed'
                            ? 'bg-green-100 text-green-800 border border-green-300 shadow-sm'
                            : 'bg-panel/50 text-muted border border-transparent'
                            }`}
                    >
                        <span className="text-lg mb-0.5">✅</span>
                        <span className="text-[10px] leading-tight">Completed</span>
                        <span className="text-[9px] opacity-70 mt-0.5">({completedTasks.length})</span>
                    </button>
                </div>

                {/* Horizontally Scrollable Columns */}
                <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 flex overflow-x-scroll overflow-y-hidden snap-x snap-mandatory scrollbar-hide w-full"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
                >
                    {/* Pending Column */}
                    <div className="w-full flex-shrink-0 snap-start flex flex-col h-full px-2 py-0">
                        <KanbanColumn
                            title="Pending"
                            status="pending"
                            tasks={pendingTasks.map((t, index) => ({
                                id: t.id,
                                taskId: t.taskId,
                                customerName: t.customerName,
                                workTitle: t.workTitle,
                                work: t.work,
                                assignedRole: t.assignedRole,
                                status: t.status,
                                assignedOn: t.assignedOn,
                                taskNumber: index + 1,
                                onClick: () => handleTaskClick(t.id),
                            }))}
                            onTaskClick={handleTaskClick}
                            onStatusChange={handleStatusChange}
                            statusColors={STATUS_CONFIG}
                        />
                    </div>

                    {/* In Progress Column */}
                    <div className="w-full flex-shrink-0 snap-start flex flex-col h-full px-2 py-0">
                        <KanbanColumn
                            title="In Progress"
                            status="in-progress"
                            tasks={inProgressTasks.map((t, index) => ({
                                id: t.id,
                                taskId: t.taskId,
                                customerName: t.customerName,
                                workTitle: t.workTitle,
                                work: t.work,
                                assignedRole: t.assignedRole,
                                status: t.status,
                                assignedOn: t.assignedOn,
                                taskNumber: index + 1,
                                onClick: () => handleTaskClick(t.id),
                            }))}
                            onTaskClick={handleTaskClick}
                            onStatusChange={handleStatusChange}
                            statusColors={STATUS_CONFIG}
                        />
                    </div>

                    {/* Completed Column */}
                    <div className="w-full flex-shrink-0 snap-start flex flex-col h-full px-2 py-0">
                        <KanbanColumn
                            title="Completed"
                            status="completed"
                            tasks={completedTasks.map((t, index) => ({
                                id: t.id,
                                taskId: t.taskId,
                                customerName: t.customerName,
                                workTitle: t.workTitle,
                                work: t.work,
                                assignedRole: t.assignedRole,
                                status: t.status,
                                assignedOn: t.assignedOn,
                                taskNumber: index + 1,
                                onClick: () => handleTaskClick(t.id),
                            }))}
                            onTaskClick={handleTaskClick}
                            onStatusChange={handleStatusChange}
                            statusColors={STATUS_CONFIG}
                        />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col">
            <DesktopView />
            <TabletView />
            <MobileView />

            {/* Task Detail Modal */}
            <TaskDetailModal
                task={selectedTask}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </div>
    );
};
