// frontend/src/components/TaskItem.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../utils/supabase';

// Extended Task type that includes optional subtask counts
interface ExtendedTask extends Task {
    subtasks_count?: number;
    subtasks_completed?: number;
}

type TaskItemProps = {
    task: ExtendedTask;
    onPress: () => void;
    onToggleCompletion?: (task: ExtendedTask) => void;
};

const TaskItem = ({ task, onPress, onToggleCompletion }: TaskItemProps) => {
    // Format the due date if present
    const formatDueDate = (dateString?: string | null) => {
        if (!dateString) return null;

        const date = new Date(dateString);
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Check if the date is today, tomorrow, or another day
        if (date.toDateString() === now.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        }
    };

    // Get priority color
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return '#e74c3c';
            case 'medium':
                return '#f39c12';
            case 'low':
                return '#27ae60';
            default:
                return '#95a5a6';
        }
    };

    // Calculate if task is overdue
    const isOverdue = () => {
        if (!task.due_date || task.status === 'completed') return false;

        const dueDate = new Date(task.due_date);
        const now = new Date();

        // Reset time components for date comparison
        dueDate.setHours(23, 59, 59, 999);
        now.setHours(0, 0, 0, 0);

        return dueDate < now;
    };

    // Calculate if due date is close (within 24 hours)
    const isDueSoon = () => {
        if (!task.due_date || task.status === 'completed') return false;

        const dueDate = new Date(task.due_date);
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // If due date is today
        return dueDate.toDateString() === now.toDateString();
    };

    const dueDate = formatDueDate(task.due_date);
    const overdue = isOverdue();
    const dueSoon = isDueSoon();

    // Handle task completion toggle
    const handleToggleCompletion = () => {
        if (onToggleCompletion) {
            onToggleCompletion(task);
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                task.status === 'completed' && styles.completedContainer,
                overdue && styles.overdueContainer,
                dueSoon && styles.dueSoonContainer
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Task completion checkbox */}
            {onToggleCompletion && (
                <TouchableOpacity
                    style={[
                        styles.checkbox,
                        task.status === 'completed' && styles.checkboxChecked
                    ]}
                    onPress={handleToggleCompletion}
                >
                    {task.status === 'completed' && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                </TouchableOpacity>
            )}

            <View
                style={[
                    styles.priorityIndicator,
                    { backgroundColor: getPriorityColor(task.priority) }
                ]}
            />

            <View style={styles.contentContainer}>
                <View style={styles.titleRow}>
                    <Text
                        style={[
                            styles.title,
                            task.status === 'completed' && styles.completedTitle,
                            overdue && styles.overdueText
                        ]}
                        numberOfLines={1}
                    >
                        {task.title}
                    </Text>

                    {task.status === 'completed' && (
                        <Ionicons name="checkmark-circle" size={20} color="#2ecc71" style={styles.checkIcon} />
                    )}
                </View>

                {task.description ? (
                    <Text
                        style={[
                            styles.description,
                            task.status === 'completed' && styles.completedDescription
                        ]}
                        numberOfLines={1}
                    >
                        {task.description}
                    </Text>
                ) : null}

                <View style={styles.metadataContainer}>
                    {dueDate && (
                        <View style={styles.dueDateContainer}>
                            <Ionicons
                                name="calendar-outline"
                                size={14}
                                color={overdue ? "#e74c3c" : dueSoon ? "#f39c12" : "#7f8c8d"}
                            />
                            <Text style={[
                                styles.dueDate,
                                overdue && styles.overdueText,
                                dueSoon && styles.dueSoonText
                            ]}>
                                {overdue ? `Overdue: ${dueDate}` : dueDate}
                            </Text>
                        </View>
                    )}

                    {/* Show subtask count if any */}
                    {task.subtasks_count && task.subtasks_count > 0 && (
                        <View style={styles.subtaskContainer}>
                            <Ionicons name="list-outline" size={14} color="#7f8c8d" />
                            <Text style={styles.subtaskText}>
                                {task.subtasks_completed || 0}/{task.subtasks_count}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color="#bdc3c7" />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 12,  // More rounded corners for ADHD-friendly design
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        borderLeftWidth: 0,  // Will be overridden by priority indicator
    },
    completedContainer: {
        backgroundColor: '#f8f9fa',
        opacity: 0.8,
    },
    overdueContainer: {
        borderLeftWidth: 4,
        borderLeftColor: '#e74c3c',
        backgroundColor: '#ffebee',
    },
    dueSoonContainer: {
        borderLeftWidth: 4,
        borderLeftColor: '#f39c12',
        backgroundColor: '#fff8e1',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#3498db',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#3498db',
        borderColor: '#3498db',
    },
    priorityIndicator: {
        width: 6,
        height: '80%',
        borderRadius: 3,
        marginRight: 12,
    },
    contentContainer: {
        flex: 1,
        marginRight: 8,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        flex: 1,
    },
    completedTitle: {
        textDecorationLine: 'line-through',
        color: '#95a5a6',
    },
    overdueText: {
        color: '#e74c3c',
        fontWeight: '600',
    },
    dueSoonText: {
        color: '#f39c12',
        fontWeight: '500',
    },
    checkIcon: {
        marginLeft: 8,
    },
    description: {
        fontSize: 14,
        color: '#7f8c8d',
        marginTop: 4,
    },
    completedDescription: {
        color: '#bdc3c7',
    },
    metadataContainer: {
        flexDirection: 'row',
        marginTop: 8,
        alignItems: 'center',
    },
    dueDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
        backgroundColor: 'rgba(0,0,0,0.03)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    dueDate: {
        fontSize: 12,
        color: '#7f8c8d',
        marginLeft: 4,
    },
    subtaskContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.03)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    subtaskText: {
        fontSize: 12,
        color: '#7f8c8d',
        marginLeft: 4,
    }
});

export default TaskItem