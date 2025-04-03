// frontend/src/screens/tasks/TasksScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import TaskItem from '../../components/TaskItem';
import { Task } from '../../utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../../components/ScreenLayout';
import { COLORS, SPACING, Typography } from '../../utils/styles';

const TasksScreen = () => {
    const navigation = useNavigation();
    const { user, session } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
    const [error, setError] = useState<string | null>(null);

    // Refresh tasks every time the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user) {
                console.log('Screen focused, refreshing tasks for user:', user.id);
                fetchTasks();
            }
        }, [user])
    );

    // Set up a real-time subscription to task changes
    useEffect(() => {
        if (!user) return;

        console.log('Setting up real-time subscription for tasks');

        // Subscribe to changes in the tasks table for this user
        const subscription = supabase
            .channel('tasks-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for inserts, updates, and deletes
                    schema: 'public',
                    table: 'tasks',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('Real-time update received:', payload.eventType);
                    // Refresh the tasks list when any change occurs
                    fetchTasks();
                }
            )
            .subscribe();

        // Clean up the subscription when the component unmounts
        return () => {
            console.log('Cleaning up real-time subscription');
            supabase.removeChannel(subscription);
        };
    }, [user]);

    // Fetch tasks from Supabase
    const fetchTasks = async () => {
        if (!user) return;

        try {
            setRefreshing(true);
            setError(null);

            // Query tasks with subtask counts
            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    subtasks:subtasks(count),
                    subtasks_completed:subtasks(count).filter(status=eq.completed)
                `)
                .eq('user_id', user.id)
                .order('due_date', { ascending: true, nullsLast: true });

            if (error) {
                throw error;
            }

            // Process the results to include subtask counts
            const tasksWithCounts = data?.map(task => {
                return {
                    ...task,
                    subtasks_count: task.subtasks?.[0]?.count || 0,
                    subtasks_completed: task.subtasks_completed?.[0]?.count || 0
                };
            }) || [];

            console.log(`Fetched ${tasksWithCounts.length} tasks`);
            setTasks(tasksWithCounts);
            applyFilter(filter, tasksWithCounts);
        } catch (error: any) {
            console.error('Error fetching tasks:', error.message);
            setError('Failed to load tasks. Pull down to retry.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Apply filter to tasks
    const applyFilter = (filterType: 'all' | 'active' | 'completed', taskList = tasks) => {
        switch (filterType) {
            case 'active':
                setFilteredTasks(taskList.filter(task => task.status === 'active'));
                break;
            case 'completed':
                setFilteredTasks(taskList.filter(task => task.status === 'completed'));
                break;
            default:
                setFilteredTasks(taskList);
                break;
        }
        setFilter(filterType);
    };

    // Navigate to the task detail screen
    const handleTaskPress = (taskId: string) => {
        navigation.navigate('TaskDetail', { taskId } as any);
    };

    // Toggle task completion status
    const toggleTaskCompletion = async (task: Task) => {
        try {
            const newStatus = task.status === 'active' ? 'completed' : 'active';
            const newCompletedAt = newStatus === 'completed' ? new Date().toISOString() : null;

            // Optimistic update - use functional updates for atomic changes
            setTasks(prevTasks =>
                prevTasks.map(t =>
                    t.id === task.id
                        ? {...t, status: newStatus, completed_at: newCompletedAt}
                        : t
                )
            );

            // Apply filter with the updated tasks array
            setFilteredTasks(prevFiltered =>
                prevFiltered.map(t =>
                    t.id === task.id
                        ? {...t, status: newStatus, completed_at: newCompletedAt}
                        : t
                )
            );

            // Update in database
            const { error } = await supabase
                .from('tasks')
                .update({
                    status: newStatus,
                    completed_at: newCompletedAt,
                })
                .eq('id', task.id);

            if (error) throw error;
        } catch (error) {
            console.error('Error updating task status:', error.message);
            Alert.alert('Error', 'Failed to update task status');
            // Revert optimistic update by re-fetching
            fetchTasks();
        }
    };

    // Render empty state when no tasks are available
    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="checkbox-outline" size={64} color="#bdc3c7" />
            <Text style={styles.emptyTitle}>No tasks found</Text>
            <Text style={styles.emptySubtitle}>
                {filter === 'all'
                    ? 'Tap the + button to create your first task'
                    : `No ${filter} tasks found`}
            </Text>
        </View>
    );

    const renderAddButton = () => (
        <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('CreateTask' as any)}
            accessibilityLabel="Add new task"
        >
            <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
    );

    // Handle pull-to-refresh
    const handleRefresh = () => {
        fetchTasks();
    };

    return (
        <ScreenLayout
            title="Tasks"
            rightComponent={renderAddButton()}
        >
            {error && !loading && (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryButton}
                        onPress={fetchTasks}
                    >
                        <Text style={styles.retryButtonText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            )}
            <View style={styles.container}>
                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            filter === 'all' && styles.activeFilterButton,
                        ]}
                        onPress={() => applyFilter('all')}
                    >
                        <Text
                            style={[
                                styles.filterButtonText,
                                filter === 'all' && styles.activeFilterButtonText,
                            ]}
                        >
                            All
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            filter === 'active' && styles.activeFilterButton,
                        ]}
                        onPress={() => applyFilter('active')}
                    >
                        <Text
                            style={[
                                styles.filterButtonText,
                                filter === 'active' && styles.activeFilterButtonText,
                            ]}
                        >
                            Active
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.filterButton,
                            filter === 'completed' && styles.activeFilterButton,
                        ]}
                        onPress={() => applyFilter('completed')}
                    >
                        <Text
                            style={[
                                styles.filterButtonText,
                                filter === 'completed' && styles.activeFilterButtonText,
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
                ) : (
                    <FlatList
                        data={filteredTasks}
                        renderItem={({ item }) => (
                            <TaskItem
                                task={item}
                                onPress={() => handleTaskPress(item.id)}
                                onToggleCompletion={toggleTaskCompletion}
                            />
                        )}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={[
                            styles.tasksList,
                            filteredTasks.length === 0 && styles.emptyList,
                        ]}
                        ListEmptyComponent={renderEmpty}
                        onRefresh={handleRefresh}
                        refreshing={refreshing}
                    />
                )}
            </View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.light,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    errorContainer: {
        padding: 16,
        backgroundColor: '#ffebee',
        marginHorizontal: 16,
        marginTop: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    errorText: {
        color: '#e74c3c',
        marginBottom: 8,
    },
    retryButton: {
        backgroundColor: '#e74c3c',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 4,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    filterContainer: {
        flexDirection: 'row',
        padding: 16,
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    filterButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginHorizontal: 8,
        backgroundColor: '#F2F2F2',
    },
    activeFilterButton: {
        backgroundColor: '#3498db',
    },
    filterButtonText: {
        color: '#666',
        fontWeight: '500',
    },
    activeFilterButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    tasksList: {
        paddingVertical: 8,
    },
    emptyList: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 64,
        padding: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#7f8c8d',
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#95a5a6',
        textAlign: 'center',
        marginTop: 8,
    },
});

export default TasksScreen;