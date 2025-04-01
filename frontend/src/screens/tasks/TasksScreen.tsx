// frontend/src/screens/tasks/TasksScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { Task } from '../../utils/supabase';

// Define navigation types
type TasksStackParamList = {
    TasksList: undefined;
    CreateTask: undefined;
    TaskDetail: { taskId: string };
};

type Props = StackScreenProps<TasksStackParamList, 'TasksList'>;

const TasksScreen = ({ navigation }: Props) => {
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed'>('all');

    // Fetch tasks when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user) {
                fetchTasks();
            }
            return () => {}; // Cleanup function
        }, [user, activeFilter])
    );

    // Fetch tasks from Supabase
    const fetchTasks = async () => {
        try {
            setLoading(true);

            // Build the query based on the active filter
            let query = supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user?.id)
                .order('due_date', { ascending: true });

            // Apply status filter if not 'all'
            if (activeFilter === 'active') {
                query = query.eq('status', 'active');
            } else if (activeFilter === 'completed') {
                query = query.eq('status', 'completed');
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            setTasks(data || []);
        } catch (error: any) {
            console.error('Error fetching tasks:', error.message);
            Alert.alert('Error', 'Failed to load tasks. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Toggle task completion status
    const toggleTaskCompletion = async (task: Task) => {
        try {
            const newStatus = task.status === 'active' ? 'completed' : 'active';

            // Optimistic update
            setTasks(tasks.map(t =>
                t.id === task.id
                    ? {
                        ...t,
                        status: newStatus,
                        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
                    }
                    : t
            ));

            // Update in database
            const { error } = await supabase
                .from('tasks')
                .update({
                    status: newStatus,
                    completed_at: newStatus === 'completed' ? new Date().toISOString() : null
                })
                .eq('id', task.id);

            if (error) {
                throw error;
            }
        } catch (error: any) {
            console.error('Error updating task:', error.message);
            Alert.alert('Error', 'Failed to update task. Please try again.');

            // Revert the optimistic update
            fetchTasks();
        }
    };

    // Navigate to task detail
    const navigateToTaskDetail = (taskId: string) => {
        navigation.navigate('TaskDetail', { taskId });
    };

    // Render a task item
    const renderTask = ({ item }: { item: Task }) => (
        <TouchableOpacity
            style={[
                styles.taskItem,
                item.status === 'completed' && styles.completedTask
            ]}
            onPress={() => navigateToTaskDetail(item.id)}
        >
            <TouchableOpacity
                style={styles.taskCheckbox}
                onPress={(e) => {
                    e.stopPropagation(); // Prevent navigation to detail screen
                    toggleTaskCompletion(item);
                }}
            >
                {item.status === 'completed' && (
                    <View style={styles.checkboxInner} />
                )}
            </TouchableOpacity>

            <View style={styles.taskContent}>
                <Text
                    style={[
                        styles.taskTitle,
                        item.status === 'completed' && styles.completedTaskText
                    ]}
                    numberOfLines={1}
                >
                    {item.title}
                </Text>

                {item.description ? (
                    <Text
                        style={[
                            styles.taskDescription,
                            item.status === 'completed' && styles.completedTaskText
                        ]}
                        numberOfLines={2}
                    >
                        {item.description}
                    </Text>
                ) : null}

                {item.due_date ? (
                    <Text style={styles.taskDueDate}>
                        Due: {new Date(item.due_date).toLocaleDateString()}
                    </Text>
                ) : null}
            </View>

            <View
                style={[
                    styles.taskPriority,
                    styles[`priority${item.priority}`]
                ]}
            />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Tasks</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('CreateTask')}
                >
                    <Text style={styles.addButtonText}>+ Add Task</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        activeFilter === 'all' && styles.activeFilterButton,
                    ]}
                    onPress={() => setActiveFilter('all')}
                >
                    <Text
                        style={[
                            styles.filterButtonText,
                            activeFilter === 'all' && styles.activeFilterButtonText,
                        ]}
                    >
                        All
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        activeFilter === 'active' && styles.activeFilterButton,
                    ]}
                    onPress={() => setActiveFilter('active')}
                >
                    <Text
                        style={[
                            styles.filterButtonText,
                            activeFilter === 'active' && styles.activeFilterButtonText,
                        ]}
                    >
                        Active
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.filterButton,
                        activeFilter === 'completed' && styles.activeFilterButton,
                    ]}
                    onPress={() => setActiveFilter('completed')}
                >
                    <Text
                        style={[
                            styles.filterButtonText,
                            activeFilter === 'completed' && styles.activeFilterButtonText,
                        ]}
                    >
                        Completed
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3498db" />
                </View>
            ) : tasks.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No tasks found</Text>
                    <Text style={styles.emptySubtext}>
                        {activeFilter === 'all'
                            ? 'Tap the "+" button to create your first task'
                            : `No ${activeFilter} tasks found`}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={tasks}
                    renderItem={renderTask}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.taskList}
                    onRefresh={fetchTasks}
                    refreshing={loading}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9FC',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    addButton: {
        backgroundColor: '#3498db',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
    },
    addButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    filterButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        borderRadius: 16,
        backgroundColor: '#F0F0F0',
    },
    activeFilterButton: {
        backgroundColor: '#E1F0FE',
    },
    filterButtonText: {
        color: '#7F8C8D',
        fontWeight: '500',
    },
    activeFilterButtonText: {
        color: '#3498db',
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
    },
    taskList: {
        padding: 16,
    },
    taskItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    completedTask: {
        backgroundColor: '#F7F7F7',
    },
    taskCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#3498db',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxInner: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#3498db',
    },
    taskContent: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    taskDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 6,
    },
    completedTaskText: {
        textDecorationLine: 'line-through',
        color: '#999',
    },
    taskDueDate: {
        fontSize: 12,
        color: '#888',
    },
    taskPriority: {
        width: 4,
        height: '100%',
        borderRadius: 2,
        marginLeft: 12,
    },
    prioritylow: {
        backgroundColor: '#2ecc71',
    },
    prioritymedium: {
        backgroundColor: '#f39c12',
    },
    priorityhigh: {
        backgroundColor: '#e74c3c',
    },
});

export default TasksScreen;