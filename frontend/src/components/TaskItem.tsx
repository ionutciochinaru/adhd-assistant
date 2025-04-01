// frontend/src/components/TaskItem.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../utils/supabase';

type TaskItemProps = {
    task: Task;
    onPress: () => void;
};

const TaskItem = ({ task, onPress }: TaskItemProps) => {
    // Format the due date if present
    const formatDueDate = (dateString?: string) => {
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

    const dueDate = formatDueDate(task.due_date);

    return (
        <TouchableOpacity
            style={[
                styles.container,
                task.status === 'completed' && styles.completedContainer
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
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
                            task.status === 'completed' && styles.completedTitle
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

                {dueDate && (
                    <View style={styles.dueDateContainer}>
                        <Ionicons name="calendar-outline" size={14} color="#7f8c8d" />
                        <Text style={styles.dueDate}>{dueDate}</Text>
                    </View>
                )}
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
        borderRadius: 8,
        marginHorizontal: 16,
        marginVertical: 6,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    completedContainer: {
        backgroundColor: '#f8f9fa',
    },
    priorityIndicator: {
        width: 4,
        height: '100%',
        borderRadius: 2,
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
    dueDateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    dueDate: {
        fontSize: 12,
        color: '#7f8c8d',
        marginLeft: 4,
    },
});

export default TaskItem;