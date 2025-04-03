// frontend/src/components/TaskItem.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../utils/supabase';
import { COLORS, SPACING, FONTS, Typography, CommonStyles, RADIUS, SHADOWS } from '../utils/styles';

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

    // Get priority color
    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return COLORS.highPriority;
            case 'medium':
                return COLORS.mediumPriority;
            case 'low':
                return COLORS.lowPriority;
            default:
                return COLORS.textTertiary;
        }
    };

    // Get priority background color
    const getPriorityBackgroundColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return COLORS.cardRed;
            case 'medium':
                return COLORS.cardOrange;
            case 'low':
                return COLORS.cardGreen;
            default:
                return COLORS.cardBlue;
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
    const priorityColor = getPriorityColor(task.priority);
    const priorityBgColor = getPriorityBackgroundColor(task.priority);

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
                { backgroundColor: task.status === 'completed' ? COLORS.background : priorityBgColor },
                task.status === 'completed' && styles.completedContainer
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {/* Task completion checkbox */}
            {onToggleCompletion && (
                <TouchableOpacity
                    style={[
                        styles.checkbox,
                        task.status === 'completed' ? styles.checkboxChecked : null,
                        { borderColor: priorityColor }
                    ]}
                    onPress={handleToggleCompletion}
                >
                    {task.status === 'completed' ? (
                        <Ionicons name="checkmark" size={16} color={COLORS.white} />
                    ) : null}
                </TouchableOpacity>
            )}

            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
                        <Ionicons
                            name={getPriorityIcon(task.priority)}
                            size={12}
                            color={COLORS.white}
                        />
                        <Text style={styles.priorityText}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </Text>
                    </View>

                    {/* Due date badge */}
                    {dueDate && (
                        <View style={[
                            styles.dueDateBadge,
                            overdue ? styles.overdueBadge : dueSoon ? styles.dueSoonBadge : null
                        ]}>
                            <Ionicons
                                name={overdue ? "alert-circle" : dueSoon ? "time" : "calendar-outline"}
                                size={12}
                                color={overdue ? COLORS.white : dueSoon ? COLORS.white : COLORS.textSecondary}
                            />
                            <Text style={[
                                styles.dueDateText,
                                overdue ? styles.overdueText : dueSoon ? styles.dueSoonText : null
                            ]}>
                                {dueDate}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Task title */}
                <Text
                    style={[
                        styles.taskTitle,
                        task.status === 'completed' && styles.completedTitle
                    ]}
                    numberOfLines={2}
                >
                    {task.title}
                </Text>

                {/* Description if available */}
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

                {/* Time remaining badge */}
                {remainingTime && (
                    <View style={[
                        styles.timeRemainingContainer,
                        overdue ? styles.overdueBadge : dueSoon ? styles.dueSoonBadge : null
                    ]}>
                        <Ionicons
                            name={overdue ? "hourglass" : "stopwatch"}
                            size={12}
                            color={overdue ? COLORS.white : dueSoon ? COLORS.white : COLORS.textSecondary}
                        />
                        <Text style={[
                            styles.timeRemainingText,
                            overdue ? styles.overdueText : dueSoon ? styles.dueSoonText : null
                        ]}>
                            {remainingTime}
                        </Text>
                    </View>
                )}

                {/* Subtask progress bar */}
                {(task.subtasks_count && task.subtasks_count > 0) ? (
                    <View style={styles.subtaskSection}>
                        <View style={styles.subtaskHeader}>
                            <Ionicons name="list-outline" size={12} color={COLORS.textSecondary} />
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
                    color={task.status === 'completed' ? COLORS.textTertiary : priorityColor}
                />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.md,
        marginVertical: SPACING.sm,
        padding: SPACING.md,
        ...SHADOWS.small,
    },
    completedContainer: {
        opacity: 0.7,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: RADIUS.sm,
        borderWidth: 2,
        marginRight: SPACING.md,
        marginTop: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: COLORS.success,
        borderColor: COLORS.success,
    },
    contentContainer: {
        flex: 1,
        marginRight: SPACING.sm,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.xxs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.round,
    },
    priorityText: {
        fontSize: FONTS.size.xxs,
        fontWeight: '600',
        color: COLORS.white,
        marginLeft: 4,
    },
    dueDateBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.xxs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.round,
        backgroundColor: COLORS.cardShadow,
    },
    overdueBadge: {
        backgroundColor: COLORS.danger,
    },
    dueSoonBadge: {
        backgroundColor: COLORS.warning,
    },
    dueDateText: {
        fontSize: FONTS.size.xxs,
        fontWeight: '500',
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
    overdueText: {
        color: COLORS.white,
    },
    dueSoonText: {
        color: COLORS.white,
    },
    taskTitle: {
        ...Typography.bodyMedium,
        fontSize: FONTS.size.md,
        fontWeight: '600',
        marginBottom: SPACING.xs,
        lineHeight: 22,
    },
    completedTitle: {
        textDecorationLine: 'line-through',
        color: COLORS.textTertiary,
    },
    description: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
        lineHeight: 18,
    },
    completedDescription: {
        textDecorationLine: 'line-through',
        color: COLORS.textTertiary,
    },
    timeRemainingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardShadow,
        paddingVertical: SPACING.xxs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.round,
        marginTop: SPACING.xs,
        alignSelf: 'flex-start',
    },
    timeRemainingText: {
        fontSize: FONTS.size.xxs,
        fontWeight: '500',
        color: COLORS.textSecondary,
        marginLeft: 4,
    },
    subtaskSection: {
        marginTop: SPACING.sm,
    },
    subtaskHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    subtaskText: {
        fontSize: FONTS.size.xs,
        color: COLORS.textSecondary,
        marginLeft: SPACING.xs,
        fontWeight: '500',
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: COLORS.cardShadow,
        borderRadius: RADIUS.round,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.round,
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