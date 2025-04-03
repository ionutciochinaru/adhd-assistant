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
    onPress: () => void;
    onToggleCompletion?: (task: Task) => void;
};

const TaskItem: React.FC<TaskItemProps> = ({ task, onPress, onToggleCompletion }) => {
    // Calculate subtask progress
    const subtaskProgress = task.subtasks_count && task.subtasks_count > 0
        ? Math.round(((task.subtasks_completed || 0) / task.subtasks_count) * 100)
        : 0;

    // Priority color and icon mapping
    const getPriorityStyles = () => {
        switch (task.priority) {
            case 'high':
                return {
                    color: COLORS.highPriority,
                    icon: 'alert-circle',
                    badgeStyle: {
                        backgroundColor: COLORS.highPriority,
                    }
                };
            case 'medium':
                return {
                    color: COLORS.mediumPriority,
                    icon: 'alert',
                    badgeStyle: {
                        backgroundColor: COLORS.mediumPriority,
                    }
                };
            case 'low':
            default:
                return {
                    color: COLORS.lowPriority,
                    icon: 'checkmark-circle',
                    badgeStyle: {
                        backgroundColor: COLORS.lowPriority,
                    }
                };
        }
    };

    const priorityStyles = getPriorityStyles();

    // Determine due date status
    const getDueDateStatus = () => {
        if (!task.due_date) return null;

        const dueDate = new Date(task.due_date);
        const now = new Date();

        if (task.status === 'completed') return null;

        if (dueDate < now) {
            return {
                text: 'Expires Soon',
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

    const dueDateStatus = getDueDateStatus();

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

    // Truncate title if it's too long
    const truncateTitle = (title: string, maxLength: number = 30) => {
        return title.length > maxLength ? `${title.slice(0, maxLength)}...` : title;
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                task.status === 'completed' && styles.completedContainer
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            {/* Header with Date and Badges */}
            <View style={styles.headerContainer}>
                <Text style={styles.dateText}>
                    {task.due_date ? formatDate(new Date(task.due_date)) : 'No Due Date'}
                </Text>
                {dueDateStatus && (
                    <View style={[styles.statusBadge, dueDateStatus.style]}>
                        <Text style={[styles.statusBadgeText, dueDateStatus.textStyle]}>
                            {dueDateStatus.text}
                        </Text>
                    </View>
                )}
            </View>

            {/* Task Title with Priority */}
            <View style={styles.titleContainer}>
                <Text
                    style={[
                        styles.taskTitle,
                        task.status === 'completed' && styles.completedTitle
                    ]}
                    numberOfLines={1}
                >
                    {truncateTitle(task.title)}
                </Text>
                <View style={[
                    styles.priorityBadge,
                    priorityStyles.badgeStyle
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

            {/* Subtasks */}
            {task.subtasks && task.subtasks.length > 0 && (
                <View style={styles.subtasksSection}>
                    <Text style={styles.subtasksHeader}>Subtasks</Text>
                    {task.subtasks.map((subtask) => (
                        <View key={subtask.id} style={styles.subtaskItem}>
                            <Ionicons
                                name={subtask.status === 'completed'
                                    ? 'checkmark-circle'
                                    : 'radio-button-off'
                                }
                                size={16}
                                color={subtask.status === 'completed'
                                    ? COLORS.success
                                    : COLORS.textSecondary
                                }
                            />
                            <Text
                                style={[
                                    styles.subtaskText,
                                    subtask.status === 'completed' && styles.completedSubtaskText
                                ]}
                            >
                                {subtask.title}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Subtasks Progress */}
            {task.subtasks_count && task.subtasks_count > 0 && (
                <View style={styles.subtasksContainer}>
                    <View style={styles.progressContainer}>
                        <View
                            style={[
                                styles.progressBar,
                                { width: `${subtaskProgress}%` }
                            ]}
                        />
                    </View>
                    <Text style={styles.subtasksText}>
                        {task.subtasks_completed} of {task.subtasks_count} subtasks
                    </Text>
                </View>
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
        opacity: 0.5,
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
    dateText: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
    },
    badgesContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    statusBadge: {
        paddingVertical: 0,
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

    priorityBadgePosition: {
        position: 'relative',
    },
    completionToggle: {
        position: 'relative',
        top: SPACING.sm,
        right: SPACING.sm,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    incompleteToggle: {
        width: 24,
        height: 24,
        borderRadius: RADIUS.round,
        borderWidth: 2,
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
    subtasksSection: {
        marginBottom: SPACING.sm,
    },
    subtasksHeader: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    subtaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    subtaskText: {
        ...Typography.bodySmall,
        marginLeft: SPACING.xs,
    },
    completedSubtaskText: {
        textDecorationLine: 'line-through',
        color: COLORS.textTertiary,
    },
    subtasksContainer: {
        marginBottom: SPACING.sm,
    },
    progressContainer: {
        height: 6,
        backgroundColor: COLORS.cardShadow,
        borderRadius: RADIUS.round,
        marginBottom: SPACING.xs,
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
        textAlign: 'right',
    },
});

export default TaskItem;

