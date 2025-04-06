// src/components/TaskItem.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task, Subtask } from '../utils/supabase';
import { COLORS, SPACING, FONTS, Typography, RADIUS, SHADOWS } from '../utils/styles';

type TaskItemProps = {
    task: Task & {
        subtasks?: Subtask[];
        subtasks_count?: number;
        subtasks_completed?: number;
    };
    onPomodoroStart: (task: Task) => void;
    onOptionsPress: () => void;
};

const TaskItem: React.FC<TaskItemProps> = ({
                                               task,
                                               onPomodoroStart,
                                               onOptionsPress
                                           }) => {
    // Calculate subtask progress
    const subtaskProgress = task.subtasks_count && task.subtasks_count > 0
        ? Math.round(((task.subtasks_completed || 0) / task.subtasks_count) * 100)
        : 0;

    // Determine due date status
    const getDueDateStatus = () => {
        if (!task.due_date) return null;

        const dueDate = new Date(task.due_date);
        const now = new Date();

        if (task.status === 'completed') return null;

        if (dueDate < now) {
            return {
                text: 'Overdue',
                style: styles.overdueBadge,
                textStyle: styles.overdueBadgeText
            };
        }

        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);

        if (dueDate < tomorrow) {
            return {
                text: 'Due Soon',
                style: styles.dueSoonBadge,
                textStyle: styles.dueSoonBadgeText
            };
        }

        return null;
    };

    // Format date with optional time
    const formatDate = (date: Date) => {
        const dateOptions: Intl.DateTimeFormatOptions = {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        };
        const timeOptions: Intl.DateTimeFormatOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        };

        const formattedDate = date.toLocaleDateString('en-US', dateOptions);
        const formattedTime = date.toLocaleTimeString('en-US', timeOptions);

        return task.due_date ? `${formattedDate} ${formattedTime}` : 'No Due Date';
    };

    // Get the priority color
    const getPriorityColor = () => {
        switch (task.priority) {
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

    // Determine work button style based on priority and due date
    const getWorkButtonStyle = () => {
        const dueStatus = getDueDateStatus();

        if (dueStatus?.text === 'Overdue') {
            return {
                backgroundColor: COLORS.danger,
                text: 'Start Now!'
            };
        }

        if (dueStatus?.text === 'Due Soon') {
            return {
                backgroundColor: COLORS.warning,
                text: 'Start Soon'
            };
        }

        switch (task.priority) {
            case 'high':
                return {
                    backgroundColor: COLORS.highPriority,
                    text: 'Start Work'
                };
            case 'medium':
                return {
                    backgroundColor: COLORS.mediumPriority,
                    text: 'Start Work'
                };
            case 'low':
                return {
                    backgroundColor: COLORS.lowPriority,
                    text: 'Start Work'
                };
            default:
                return {
                    backgroundColor: COLORS.primary,
                    text: 'Start Work'
                };
        }
    };

    const dueDateStatus = getDueDateStatus();
    const workButtonStyle = getWorkButtonStyle();

    return (
        <TouchableOpacity
            style={[
                styles.container,
                task.status === 'completed' && styles.completedContainer
            ]}
            activeOpacity={0.8}
        >
            {/* Header with Date and Options */}
            <View style={styles.headerContainer}>
                <Text style={styles.dateText}>
                    {task.due_date ? formatDate(new Date(task.due_date)) : 'No Due Date'}
                </Text>

                <View style={styles.headerRight}>
                    {dueDateStatus && (
                        <View style={[styles.statusBadge, dueDateStatus.style]}>
                            <Text style={[styles.statusBadgeText, dueDateStatus.textStyle]}>
                                {dueDateStatus.text}
                            </Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={styles.optionsButton}
                        onPress={onOptionsPress}
                    >
                        <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Task Title with Priority */}
            <View style={styles.titleContainer}>
                <Text
                    style={[
                        styles.taskTitle,
                        task.status === 'completed' && styles.completedTitle
                    ]}
                    numberOfLines={2}
                >
                    {task.title}
                </Text>
                <View style={[
                    styles.priorityBadge,
                    { backgroundColor: getPriorityColor() }
                ]}>
                    <Text style={styles.priorityText}>
                        {task.priority.charAt(0).toUpperCase()}
                    </Text>
                </View>
            </View>

            {/* Description */}
            {task.description && (
                <Text
                    style={[
                        styles.taskDescription,
                        task.status === 'completed' && styles.completedDescription
                    ]}
                    numberOfLines={2}
                >
                    {task.description}
                </Text>
            )}

            {/* Subtasks Section */}
            {task.subtasks && task.subtasks.length > 0 && (
                <View style={styles.subtasksContainer}>
                    {/* Subtasks Progress Bar */}
                    <View style={styles.progressHeaderContainer}>
                        <Text style={styles.subtasksHeader}>Subtasks</Text>
                        <Text style={styles.subtasksText}>
                            {task.subtasks.filter(s => s.status === 'completed').length} of {task.subtasks.length}
                        </Text>
                    </View>

                    <View style={styles.progressContainer}>
                        <View
                            style={[
                                styles.progressBar,
                                { width: `${subtaskProgress}%` }
                            ]}
                        />
                    </View>

                    {/* Subtasks List (showing up to 5) */}
                    <View style={styles.subtasksList}>
                        {task.subtasks.slice(0, 5).map((subtask, index) => (
                            <View key={subtask.id || index} style={styles.subtaskItem}>
                                <View style={[
                                    styles.subtaskCheckbox,
                                    subtask.status === 'completed' && styles.subtaskCheckboxCompleted
                                ]}>
                                    {subtask.status === 'completed' && (
                                        <Ionicons name="checkmark" size={12} color={COLORS.white} />
                                    )}
                                </View>
                                <Text
                                    style={[
                                        styles.subtaskText,
                                        subtask.status === 'completed' && styles.subtaskTextCompleted
                                    ]}
                                    numberOfLines={1}
                                >
                                    {subtask.title}
                                </Text>
                            </View>
                        ))}
                        {task.subtasks.length > 5 && (
                            <Text style={styles.moreSubtasksText}>
                                +{task.subtasks.length - 5} more subtasks
                            </Text>
                        )}
                    </View>
                </View>
            )}

            {/* Start Work Button */}
            {task.status !== 'completed' && (
                <TouchableOpacity
                    style={[styles.workButton, { backgroundColor: workButtonStyle.backgroundColor }]}
                    onPress={() => onPomodoroStart(task)}
                >
                    <Ionicons name="timer-outline" size={18} color={COLORS.white} style={styles.workButtonIcon} />
                    <Text style={styles.workButtonText}>{workButtonStyle.text}</Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
};


const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.md,
        marginVertical: SPACING.sm,
        padding: SPACING.md,
        ...SHADOWS.small,
        position: 'relative',
    },
    completedContainer: {
        opacity: 0.7,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: SPACING.sm,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateText: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
    },
    statusBadge: {
        paddingVertical: 2,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.round,
        marginRight: SPACING.xs,
    },
    overdueBadge: {
        backgroundColor: '#FFE5E5',
    },
    dueSoonBadge: {
        backgroundColor: '#FFF5E5',
    },
    statusBadgeText: {
        ...Typography.tiny,
        fontWeight: FONTS.weight.semiBold,
    },
    overdueBadgeText: {
        color: COLORS.danger,
    },
    dueSoonBadgeText: {
        color: COLORS.warning,
    },
    optionsButton: {
        padding: SPACING.xs,
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: SPACING.sm,
    },
    taskTitle: {
        ...Typography.bodyMedium,
        fontSize: FONTS.size.md,
        flex: 1,
        marginRight: SPACING.sm,
        color: COLORS.textPrimary,
    },
    completedTitle: {
        textDecorationLine: 'line-through',
        color: COLORS.textTertiary,
    },
    priorityBadge: {
        width: 24,
        height: 24,
        borderRadius: RADIUS.round,
        justifyContent: 'center',
        alignItems: 'center',
    },
    priorityText: {
        ...Typography.tiny,
        color: COLORS.white,
        fontWeight: FONTS.weight.bold,
    },
    taskDescription: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: SPACING.sm,
    },
    completedDescription: {
        textDecorationLine: 'line-through',
        color: COLORS.textTertiary,
    },
    subtasksContainer: {
        marginBottom: SPACING.sm,
        paddingTop: SPACING.sm,
    },
    progressHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    subtasksHeader: {
        ...Typography.bodySmall,
        fontWeight: FONTS.weight.semiBold,
        color: COLORS.textSecondary,
    },
    progressContainer: {
        height: 6,
        backgroundColor: COLORS.cardShadow,
        borderRadius: RADIUS.round,
        marginBottom: SPACING.sm,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.round,
    },
    subtasksText: {
        ...Typography.tiny,
        color: COLORS.textSecondary,
    },
    subtasksList: {
        marginTop: SPACING.xs,
    },
    subtaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    subtaskCheckbox: {
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.xs,
    },
    subtaskCheckboxCompleted: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    subtaskText: {
        ...Typography.bodySmall,
        flex: 1,
    },
    subtaskTextCompleted: {
        textDecorationLine: 'line-through',
        color: COLORS.textTertiary,
    },
    moreSubtasksText: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        marginTop: SPACING.xs,
    },
    workButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.sm,
        marginTop: SPACING.xs,
    },
    workButtonIcon: {
        marginRight: SPACING.xs,
    },
    workButtonText: {
        ...Typography.bodySmall,
        color: COLORS.white,
        fontWeight: FONTS.weight.semiBold,
    }
});

export default TaskItem;