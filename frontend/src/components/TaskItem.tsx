// frontend/src/components/TaskItem.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../utils/supabase';
import { COLORS, SPACING, FONTS, Typography } from '../utils/styles';

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
    // Format the due date if present with time details
    const formatDueDate = (dateString?: string | null) => {
        if (!dateString) return null;

        const date = new Date(dateString);
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get time part formatted nicely
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Check if the date is today, tomorrow, or another day
        if (date.toDateString() === now.toDateString()) {
            return `Today, ${timeStr}`;
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return `Tomorrow, ${timeStr}`;
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };

    // Get priority color from app colors
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return COLORS.highPriority;
            case 'medium':
                return COLORS.mediumPriority;
            case 'low':
                return COLORS.lowPriority;
            default:
                return COLORS.gray;
        }
    };

    // Get priority icon
    const getPriorityIcon = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'alert-circle';
            case 'medium':
                return 'alert';
            case 'low':
                return 'checkmark-circle';
            default:
                return 'help-circle';
        }
    };

    // Calculate if task is overdue
    const isOverdue = () => {
        if (!task.due_date || task.status === 'completed') return false;

        const dueDate = new Date(task.due_date);
        const now = new Date();

        return dueDate < now;
    };

    // Calculate if due date is close (within 24 hours)
    const isDueSoon = () => {
        if (!task.due_date || task.status === 'completed') return false;

        const dueDate = new Date(task.due_date);
        const now = new Date();
        const twentyFourHoursLater = new Date(now);
        twentyFourHoursLater.setHours(now.getHours() + 24);

        return dueDate > now && dueDate <= twentyFourHoursLater;
    };

    // Calculate remaining time in a human-readable format
    const getRemainingTime = () => {
        if (!task.due_date || task.status === 'completed') return null;

        const dueDate = new Date(task.due_date);
        const now = new Date();

        if (dueDate < now) {
            // Task is overdue
            const diffMs = now.getTime() - dueDate.getTime();
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

            if (diffHrs < 24) {
                return `${diffHrs} hr${diffHrs !== 1 ? 's' : ''} overdue`;
            } else {
                const diffDays = Math.floor(diffHrs / 24);
                return `${diffDays} day${diffDays !== 1 ? 's' : ''} overdue`;
            }
        } else {
            // Task is upcoming
            const diffMs = dueDate.getTime() - now.getTime();
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

            if (diffHrs < 24) {
                return `${diffHrs} hr${diffHrs !== 1 ? 's' : ''} left`;
            } else {
                const diffDays = Math.floor(diffHrs / 24);
                return `${diffDays} day${diffDays !== 1 ? 's' : ''} left`;
            }
        }
    };

    const dueDate = formatDueDate(task.due_date);
    const overdue = isOverdue();
    const dueSoon = isDueSoon();
    const remainingTime = getRemainingTime();

    // Handle task completion toggle
    const handleToggleCompletion = () => {
        if (onToggleCompletion) {
            onToggleCompletion(task);
        }
    };

    // Calculate progress for subtasks
    const calculateProgress = () => {
        if (!task.subtasks_count || task.subtasks_count === 0) return 0;
        return ((task.subtasks_completed || 0) / task.subtasks_count) * 100;
    };

    const subtaskProgress = calculateProgress();

    return (
        <TouchableOpacity
            style={[
                styles.container,
                task.status === 'completed' ? styles.completedContainer : null,
                overdue ? styles.overdueContainer : null,
                dueSoon ? styles.dueSoonContainer : null
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Task completion checkbox */}
            {onToggleCompletion ? (
                <TouchableOpacity
                    style={[
                        styles.checkbox,
                        task.status === 'completed' ? styles.checkboxChecked : null,
                        { borderColor: getPriorityColor(task.priority) }
                    ]}
                    onPress={handleToggleCompletion}
                >
                    {task.status === 'completed' ? (
                        <Ionicons name="checkmark" size={16} color={COLORS.white} />
                    ) : null}
                </TouchableOpacity>
            ) : null}

            <View style={styles.contentContainer}>
                <View style={styles.titleRow}>
                    <View style={styles.priorityBadge}>
                        <Ionicons
                            name={getPriorityIcon(task.priority)}
                            size={14}
                            color={getPriorityColor(task.priority)}
                        />
                        <Text style={[styles.priorityText, { color: getPriorityColor(task.priority) }]}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </Text>
                    </View>

                    <Text
                        style={[
                            styles.taskTitle,
                            task.status === 'completed' ? styles.completedTitle : null
                        ]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                    >
                        {task.title}
                    </Text>
                </View>

                {task.description ? (
                    <Text
                        style={[
                            styles.description,
                            task.status === 'completed' ? styles.completedDescription : null
                        ]}
                        numberOfLines={1}
                    >
                        {task.description}
                    </Text>
                ) : null}

                <View style={styles.metadataContainer}>
                    {dueDate ? (
                        <View style={[
                            styles.dueDateContainer,
                            overdue ? styles.overdueIndicator : dueSoon ? styles.dueSoonIndicator : null
                        ]}>
                            <Ionicons
                                name={overdue ? "alert-circle" : dueSoon ? "time" : "calendar-outline"}
                                size={16}
                                color={overdue ? COLORS.white : dueSoon ? COLORS.white : COLORS.gray}
                            />
                            <Text style={[
                                styles.dueDate,
                                overdue ? styles.overdueText : dueSoon ? styles.dueSoonText : null
                            ]}>
                                {dueDate}
                            </Text>
                        </View>
                    ) : null}

                    {remainingTime && (
                        <View style={[
                            styles.timeRemainingContainer,
                            overdue ? styles.overdueIndicator : dueSoon ? styles.dueSoonIndicator : null
                        ]}>
                            <Ionicons
                                name={overdue ? "hourglass" : "stopwatch"}
                                size={16}
                                color={overdue ? COLORS.white : dueSoon ? COLORS.white : COLORS.gray}
                            />
                            <Text style={[
                                styles.timeRemainingText,
                                overdue ? styles.overdueText : dueSoon ? styles.dueSoonText : null
                            ]}>
                                {remainingTime}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Subtask progress bar */}
                {(task.subtasks_count && task.subtasks_count > 0) ? (
                    <View style={styles.subtaskSection}>
                        <View style={styles.subtaskHeader}>
                            <Ionicons name="list-outline" size={14} color={COLORS.gray} />
                            <Text style={styles.subtaskText}>
                                {task.subtasks_completed || 0}/{task.subtasks_count} subtasks
                            </Text>
                        </View>
                        <View style={styles.progressBarContainer}>
                            <View
                                style={[
                                    styles.progressBar,
                                    { width: `${subtaskProgress}%` },
                                    task.status === 'completed' ? styles.completedProgressBar : null
                                ]}
                            />
                        </View>
                    </View>
                ) : null}
            </View>

            <View style={styles.chevronContainer}>
                <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={task.status === 'completed' ? COLORS.lightGray : COLORS.primary}
                />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.white,
        borderRadius: 14,
        marginHorizontal: SPACING.md,
        marginVertical: SPACING.sm,
        padding: SPACING.md,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        borderLeftWidth: 0,
    },
    taskTitle: {
        ...Typography.bodyMedium,
        fontSize: FONTS.size.md,
        fontWeight: FONTS.weight.semiBold,
        color: COLORS.dark,
        marginBottom: SPACING.xs,
        lineHeight: 22,
        flex: 1,
    },
    completedContainer: {
        backgroundColor: COLORS.light,
        opacity: 0.85,
        borderColor: COLORS.border,
        borderWidth: 1,
    },
    overdueContainer: {
        borderLeftWidth: 6,
        borderLeftColor: COLORS.danger,
        backgroundColor: '#fef2f1', // Light red background
    },
    dueSoonContainer: {
        borderLeftWidth: 6,
        borderLeftColor: COLORS.warning,
        backgroundColor: '#fef9e7', // Light yellow background
    },
    checkbox: {
        width: 28,
        height: 28,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: COLORS.primary,
        marginRight: SPACING.md,
        marginTop: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    contentContainer: {
        flex: 1,
        marginRight: SPACING.sm,
    },
    titleRow: {
        marginBottom: SPACING.xs,
    },
    completedTitle: {
        textDecorationLine: 'line-through',
        color: COLORS.gray,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    priorityText: {
        fontSize: FONTS.size.xs,
        fontWeight: FONTS.weight.semiBold,
        marginLeft: SPACING.xs,
    },
    overdueText: {
        color: COLORS.white,
        fontWeight: FONTS.weight.semiBold,
    },
    dueSoonText: {
        color: COLORS.white,
        fontWeight: FONTS.weight.medium,
    },
    checkIcon: {
        marginLeft: SPACING.sm,
    },
    description: {
        ...Typography.caption,
        fontSize: FONTS.size.sm,
        color: COLORS.gray,
        marginBottom: SPACING.sm,
        lineHeight: 18,
    },
    completedDescription: {
        color: COLORS.lightGray,
    },
    metadataContainer: {
        flexDirection: 'row',
        marginTop: SPACING.xs,
        marginBottom: SPACING.sm,
        flexWrap: 'wrap',
    },
    dueDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: SPACING.sm,
        backgroundColor: COLORS.lightGray,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: 12,
        marginBottom: SPACING.xs,
    },
    dueDate: {
        fontSize: FONTS.size.xs,
        color: COLORS.gray,
        marginLeft: SPACING.xs,
        fontWeight: FONTS.weight.medium,
    },
    timeRemainingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.lightGray,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: 12,
        marginBottom: SPACING.xs,
    },
    timeRemainingText: {
        fontSize: FONTS.size.xs,
        color: COLORS.gray,
        marginLeft: SPACING.xs,
        fontWeight: FONTS.weight.medium,
    },
    overdueIndicator: {
        backgroundColor: COLORS.danger,
    },
    dueSoonIndicator: {
        backgroundColor: COLORS.warning,
    },
    subtaskSection: {
        marginTop: SPACING.xs,
    },
    subtaskHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    subtaskText: {
        fontSize: FONTS.size.xs,
        color: COLORS.gray,
        marginLeft: SPACING.xs,
        fontWeight: FONTS.weight.medium,
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: COLORS.lightGray,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 3,
    },
    completedProgressBar: {
        backgroundColor: COLORS.success,
    },
    chevronContainer: {
        justifyContent: 'center',
        paddingLeft: SPACING.xs,
        height: '100%',
    }
});

export default TaskItem;