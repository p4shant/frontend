import type { Task } from '../__tests__/data/mockTasks';

// Status transition map - defines allowed forward transitions
const ALLOWED_TRANSITIONS: Record<Task['status'], Task['status'][]> = {
    'pending': ['in-progress'],
    'in-progress': ['completed'],
    'completed': []
};

export function canTransitionTo(currentStatus: Task['status'], newStatus: Task['status']): boolean {
    if (currentStatus === newStatus) {
        return true; // No change
    }

    const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];
    return allowedNextStatuses.includes(newStatus);
}

export function getTransitionErrorMessage(currentStatus: Task['status'], newStatus: Task['status']): string {
    if (currentStatus === newStatus) {
        return 'Task is already in this status';
    }

    const statusLabels: Record<Task['status'], string> = {
        'pending': 'Pending',
        'in-progress': 'In Progress',
        'completed': 'Completed'
    };

    return `Cannot move task from ${statusLabels[currentStatus]} to ${statusLabels[newStatus]}. Task flow is unidirectional: Pending → In Progress → Completed`;
}

export function getNextAllowedStatuses(currentStatus: Task['status']): Task['status'][] {
    return ALLOWED_TRANSITIONS[currentStatus] || [];
}
