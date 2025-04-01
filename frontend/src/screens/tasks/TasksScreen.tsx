// frontend/src/screens/tasks/TasksScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Platform,
    StatusBar,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import TaskItem from '../../components/TaskItem';
import { Task } from '../../utils/supabase';

const TasksScreen = () => {
    const navigation = useNavigation();
    const { user, session } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

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

    // Apply filter when tasks change or filter changes
    useEffect(() => {
        filterTasks();
    }, [tasks, filter]);

    // Fetch tasks from Supabase
    const fetchTasks = async () => {
        try {
            setLoading(true);
            console.log('Fetching tasks from Supabase...');

            // Get the current session token
            const token = session?.access_token;

            if (!token) {
                console.warn('No auth token available, using existing session');
            } else {
                console.log('Auth token available for API request');
            }

            const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user?.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase query error:', error);
                throw error;
            }

            console.log('Tasks fetched successfully:', data?.length || 0);
            setTasks(data || []);
        } catch (error: any) {
            console.error('Error fetching tasks:', error.message);
            Alert.alert('Error', 'Failed to load tasks. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Handle refresh action
    const onRefresh = async () => {
        console.log('Manually refreshing tasks list...');
        setRefreshing(true);
        await fetchTasks();
    };

    // Filter tasks based on selected filter
    const filterTasks = () => {
        console.log('Filtering tasks. Total tasks:', tasks.length, 'Current filter:', filter);
        switch (filter) {
            case 'active':
                setFilteredTasks(tasks.filter(task => task.status === 'active'));
                break;
            case 'completed':
                setFilteredTasks(tasks.filter(task => task.status === 'completed'));
                break;
            default:
                setFilteredTasks(tasks);
        }
    };

    // Navigation to create task screen
    const handleAddTask = () => {
        navigation.navigate('CreateTask' as never);
    };

    // Navigation to task detail screen
    const handleTaskPress = (taskId: string) => {
        navigation.navigate('TaskDetail' as never, { taskId } as never);
    };

    // Change filter and refresh
    const changeFilter = (newFilter: 'all' | 'active' | 'completed') => {
        setFilter(newFilter);
    };

    // Render empty state
    const renderEmptyState = () => {
        if (loading) return null;

        return (
            <View style={styles.emptyStateContainer}>
                <Text style={styles.emptyStateText}>No tasks found</Text>
                <Text style={styles.emptyStateSubtext}>
                    Tap the "+" button to create your first
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <StatusBar
                barStyle="dark-content"
                backgroundColor="transparent"
                translucent={true}
            />
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>My Tasks</Text>
                    <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
                        <Text style={styles.addButtonText}>+ Add Task</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'all' && styles.activeFilterButton]}
                        onPress={() => changeFilter('all')}
                    >
                        <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'active' && styles.activeFilterButton]}
                        onPress={() => changeFilter('active')}
                    >
                        <Text style={[styles.filterText, filter === 'active' && styles.activeFilterText]}>Active</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'completed' && styles.activeFilterButton]}
                        onPress={() => changeFilter('completed')}
                    >
                        <Text style={[styles.filterText, filter === 'completed' && styles.activeFilterText]}>Completed</Text>
                    </TouchableOpacity>
                </View>

                {loading && tasks.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#3498db" />
                    </View>
                ) : (
                    <FlatList
                        data={filteredTasks}
                        keyExtractor={item => item.id}
                        renderItem={({ item }) => (
                            <TaskItem task={item} onPress={() => handleTaskPress(item.id)} />
                        )}
                        contentContainerStyle={filteredTasks.length === 0 ? { flex: 1 } : styles.listContent}
                        ListEmptyComponent={renderEmptyState}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
        backgroundColor: '#ffffff',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    addButton: {
        backgroundColor: '#3498db',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    addButtonText: {
        color: '#ffffff',
        fontWeight: '600',
    },
    filterContainer: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        backgroundColor: '#f1f2f6',
    },
    activeFilterButton: {
        backgroundColor: '#3498db',
    },
    filterText: {
        fontWeight: '500',
        color: '#7f8c8d',
    },
    activeFilterText: {
        color: '#ffffff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        paddingVertical: 8,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#7f8c8d',
        marginBottom: 8,
    },
    emptyStateSubtext: {
        fontSize: 16,
        color: '#95a5a6',
        textAlign: 'center',
    },
});

export default TasksScreen;