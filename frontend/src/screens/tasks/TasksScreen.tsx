// frontend/src/screens/tasks/TasksScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
    Animated,
    SectionList,
    RefreshControl
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import TaskItem from '../../components/TaskItem';
import { Task } from '../../utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../../components/ScreenLayout';
import { COLORS, SPACING, FONTS, Typography, CommonStyles } from '../../utils/styles';

// For smooth animations
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const TasksScreen = () => {
    const navigation = useNavigation();
    const { user, session } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [sectionsData, setSectionsData] = useState<{title: string, data: Task[]}[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue' | 'upcoming'>('all');
    const [error, setError] = useState<string | null>(null);

    // Animation values
    const filterBarOpacity = useRef(new Animated.Value(1)).current;
    const addButtonScale = useRef(new Animated.Value(1)).current;

    // Refresh tasks every time the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user) {
                console.log('Screen focused, refreshing tasks for user:', user.id);
                fetchTasks();

                // Button animation on screen focus
                Animated.sequence([
                    Animated.timing(addButtonScale, {
                        toValue: 1.2,
                        duration: 200,
                        useNativeDriver: true
                    }),
                    Animated.timing(addButtonScale, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true
                    })
                ]).start();
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

    // Function to check if a task is overdue
    const isTaskOverdue = (task: Task) => {
        if (!task.due_date || task.status === 'completed') return false;
        const dueDate = new Date(task.due_date);
        const now = new Date();
        return dueDate < now;
    };

    // Function to check if a task is upcoming within 24 hours
    const isTaskUpcoming = (task: Task) => {
        if (!task.due_date || task.status === 'completed') return false;
        const dueDate = new Date(task.due_date);
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setHours(now.getHours() + 24);
        return dueDate > now && dueDate <= tomorrow;
    };

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
            updateSections(tasksWithCounts, filter);
        } catch (error: any) {
            console.error('Error fetching tasks:', error.message);
            setError('Failed to load tasks. Pull down to retry.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Update sections based on filter and tasks
    const updateSections = (taskList = tasks, filterType: string) => {
        let filteredTasks: Task[] = [];
        let sections: {title: string, data: Task[]}[] = [];

        switch (filterType) {
            case 'active':
                filteredTasks = taskList.filter(task => task.status === 'active');
                break;
            case 'completed':
                filteredTasks = taskList.filter(task => task.status === 'completed');
                break;
            case 'overdue':
                filteredTasks = taskList.filter(task => isTaskOverdue(task));
                break;
            case 'upcoming':
                filteredTasks = taskList.filter(task => isTaskUpcoming(task));
                break;
            default: // 'all'
                filteredTasks = taskList;
                break;
        }

        // For 'all' view, organize tasks into logical sections
        if (filterType === 'all') {
            const overdueTasks = taskList.filter(task => isTaskOverdue(task));
            const dueTodayTasks = taskList.filter(task => {
                if (task.due_date && task.status === 'active') {
                    const dueDate = new Date(task.due_date);
                    const now = new Date();
                    return dueDate.toDateString() === now.toDateString();
                }
                return false;
            });
            const upcomingTasks = taskList.filter(task => {
                if (task.due_date && task.status === 'active') {
                    const dueDate = new Date(task.due_date);
                    const now = new Date();
                    const today = new Date(now);
                    today.setHours(23, 59, 59, 999);
                    return dueDate > today && !isTaskOverdue(task) && !dueTodayTasks.includes(task);
                }
                return false;
            });
            const noDueDateTasks = taskList.filter(task => {
                return !task.due_date && task.status === 'active';
            });
            const completedTasks = taskList.filter(task => task.status === 'completed');

            sections = [
                { title: 'Overdue', data: overdueTasks },
                { title: 'Due Today', data: dueTodayTasks },
                { title: 'Upcoming', data: upcomingTasks },
                { title: 'No Due Date', data: noDueDateTasks },
                { title: 'Completed', data: completedTasks }
            ].filter(section => section.data.length > 0); // Only include non-empty sections
        } else {
            // For other views, just use the filtered tasks as a single section
            sections = [{ title: filterType.charAt(0).toUpperCase() + filterType.slice(1) + ' Tasks', data: filteredTasks }];
        }

        setSectionsData(sections);
    };

    // Apply filter to tasks
    const applyFilter = (filterType: 'all' | 'active' | 'completed' | 'overdue' | 'upcoming') => {
        updateSections(tasks, filterType);
        setFilter(filterType);

        // Animate filter change
        Animated.sequence([
            Animated.timing(filterBarOpacity, {
                toValue: 0.7,
                duration: 150,
                useNativeDriver: true
            }),
            Animated.timing(filterBarOpacity, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true
            })
        ]).start();
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

            // Also update the sections
            updateSections(
                tasks.map(t =>
                    t.id === task.id
                        ? {...t, status: newStatus, completed_at: newCompletedAt}
                        : t
                ),
                filter
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
            <Ionicons name="checkbox-outline" size={64} color={COLORS.lightGray} />
            <Text style={styles.emptyTitle}>No tasks found</Text>
            <Text style={styles.emptySubtitle}>
                {filter === 'all'
                    ? 'Tap the + button to create your first task'
                    : `No ${filter} tasks found`}
            </Text>
            <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={() => navigation.navigate('CreateTask' as any)}
            >
                <Ionicons name="add-circle" size={24} color={COLORS.white} />
                <Text style={styles.emptyAddButtonText}>Add Task</Text>
            </TouchableOpacity>
        </View>
    );

    const renderAddButton = () => (
        <AnimatedTouchable
            style={[
                styles.addButton,
                { transform: [{ scale: addButtonScale }] }
            ]}
            onPress={() => {
                // Button press animation
                Animated.sequence([
                    Animated.timing(addButtonScale, {
                        toValue: 0.8,
                        duration: 100,
                        useNativeDriver: true
                    }),
                    Animated.timing(addButtonScale, {
                        toValue: 1,
                        duration: 100,
                        useNativeDriver: true
                    })
                ]).start();

                navigation.navigate('CreateTask' as any);
            }}
            accessibilityLabel="Add new task"
        >
            <Ionicons name="add" size={24} color={COLORS.white} />
        </AnimatedTouchable>
    );

    // Render section header
    const renderSectionHeader = ({ section }: { section: { title: string, data: Task[] } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>
                {section.title} {section.data.length > 0 && `(${section.data.length})`}
            </Text>
            {section.title === 'Overdue' && section.data.length > 0 && (
                <View style={styles.overdueBadge}>
                    <Ionicons name="alert-circle" size={14} color={COLORS.white} />
                    <Text style={styles.overdueBadgeText}>Needs Attention</Text>
                </View>
            )}
        </View>
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
                <Animated.View
                    style={[
                        styles.filterContainer,
                        { opacity: filterBarOpacity }
                    ]}
                >
                    <ScrollableFilterBar
                        currentFilter={filter}
                        onFilterChange={applyFilter}
                    />
                </Animated.View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading your tasks...</Text>
                    </View>
                ) : (
                    <SectionList
                        sections={sectionsData}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TaskItem
                                task={item}
                                onPress={() => handleTaskPress(item.id)}
                                onToggleCompletion={toggleTaskCompletion}
                            />
                        )}
                        renderSectionHeader={renderSectionHeader}
                        contentContainerStyle={[
                            styles.tasksList,
                            sectionsData.every(section => section.data.length === 0) && styles.emptyList,
                        ]}
                        ListEmptyComponent={renderEmpty}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={handleRefresh}
                                colors={[COLORS.primary]}
                                tintColor={COLORS.primary}
                            />
                        }
                        stickySectionHeadersEnabled={true}
                    />
                )}
            </View>
        </ScreenLayout>
    );
};

// Scrollable Filter Bar Component
const ScrollableFilterBar = ({
                                 currentFilter,
                                 onFilterChange
                             }: {
    currentFilter: string;
    onFilterChange: (filter: any) => void
}) => {
    const filters = [
        { key: 'all', label: 'All', icon: 'list' },
        { key: 'overdue', label: 'Overdue', icon: 'alert-circle' },
        { key: 'upcoming', label: 'Upcoming', icon: 'time' },
        { key: 'active', label: 'Active', icon: 'checkmark-circle-outline' },
        { key: 'completed', label: 'Completed', icon: 'checkmark-circle' }
    ];

    return (
        <View style={styles.scrollableFilterContainer}>
            {filters.map(filter => (
                <TouchableOpacity
                    key={filter.key}
                    style={[
                        styles.filterButton,
                        currentFilter === filter.key && styles.activeFilterButton
                    ]}
                    onPress={() => onFilterChange(filter.key)}
                >
                    <Ionicons
                        name={filter.icon}
                        size={16}
                        color={currentFilter === filter.key ? COLORS.white : COLORS.dark}
                    />
                    <Text style={[
                        styles.filterButtonText,
                        currentFilter === filter.key && styles.activeFilterButtonText
                    ]}>
                        {filter.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
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
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    errorContainer: {
        padding: SPACING.md,
        backgroundColor: '#ffebee',
        marginHorizontal: SPACING.md,
        marginTop: SPACING.md,
        borderRadius: 8,
        alignItems: 'center',
    },
    errorText: {
        color: COLORS.danger,
        marginBottom: SPACING.sm,
        ...Typography.bodyMedium,
    },
    retryButton: {
        backgroundColor: COLORS.danger,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: 4,
    },
    retryButtonText: {
        color: COLORS.white,
        fontWeight: FONTS.weight.semiBold,
    },
    filterContainer: {
        padding: SPACING.sm,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        zIndex: 2, // Ensure filter bar is above content
    },
    scrollableFilterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: SPACING.xs,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: 20,
        backgroundColor: COLORS.lightGray,
        marginRight: SPACING.xs,
    },
    activeFilterButton: {
        backgroundColor: COLORS.primary,
    },
    filterButtonText: {
        ...Typography.caption,
        fontWeight: FONTS.weight.medium,
        marginLeft: SPACING.xs,
        color: COLORS.dark,
    },
    activeFilterButtonText: {
        color: COLORS.white,
        fontWeight: FONTS.weight.semiBold,
    },
    tasksList: {
        paddingBottom: SPACING.xxl,
    },
    emptyList: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        backgroundColor: 'rgba(248, 249, 250, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    sectionHeaderText: {
        ...Typography.bodyMedium,
        color: COLORS.dark,
        fontWeight: FONTS.weight.semiBold,
    },
    overdueBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.danger,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: 12,
        marginLeft: SPACING.sm,
    },
    overdueBadgeText: {
        color: COLORS.white,
        fontSize: FONTS.size.xs,
        fontWeight: FONTS.weight.medium,
        marginLeft: SPACING.xs,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        ...Typography.bodyMedium,
        color: COLORS.gray,
        marginTop: SPACING.md,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 64,
        padding: SPACING.xl,
    },
    emptyTitle: {
        ...Typography.h3,
        color: COLORS.gray,
        marginTop: SPACING.md,
    },
    emptySubtitle: {
        ...Typography.bodyRegular,
        color: COLORS.gray,
        textAlign: 'center',
        marginTop: SPACING.sm,
        marginBottom: SPACING.lg,
    },
    emptyAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.lg,
        borderRadius: 20,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    emptyAddButtonText: {
        color: COLORS.white,
        fontWeight: FONTS.weight.semiBold,
        marginLeft: SPACING.xs,
    },
});

export default TasksScreen;