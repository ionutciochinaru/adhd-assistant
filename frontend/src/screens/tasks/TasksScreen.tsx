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
    const [sectionsData, setSectionsData] = useState<{title: string, data: Task[], icon?: string}[]>([]);
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

    // Function to check if a task is due today
    const isTaskDueToday = (task: Task) => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        const now = new Date();
        return dueDate.toDateString() === now.toDateString();
    };

    // Function to get time period of the day (morning, afternoon, evening, night)
    const getTimePeriod = (dateString?: string | null) => {
        if (!dateString) return 'any';

        const date = new Date(dateString);
        const hours = date.getHours();

        if (hours >= 5 && hours < 12) return 'morning';
        if (hours >= 12 && hours < 17) return 'afternoon';
        if (hours >= 17 && hours < 21) return 'evening';
        return 'night';
    };

    // Get icon for time period
    const getTimeIcon = (period: string) => {
        switch (period) {
            case 'morning': return 'sunny-outline';
            case 'afternoon': return 'partly-sunny-outline';
            case 'evening': return 'moon-outline';
            case 'night': return 'cloudy-night-outline';
            default: return 'time-outline';
        }
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
        let sections: {title: string, data: Task[], icon?: string}[] = [];

        // First, filter the tasks based on the selected filter
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
                filteredTasks = taskList.filter(task =>
                    task.status === 'active' && task.due_date && !isTaskDueToday(task) && !isTaskOverdue(task)
                );
                break;
            default: // 'all'
                filteredTasks = taskList;
                break;
        }

        // Create sections based on the filter type
        if (filterType === 'all') {
            // Overdue tasks get top priority
            const overdueTasks = taskList.filter(task => isTaskOverdue(task));

            // Get today's tasks and group by time of day
            const todaysTasks = taskList.filter(task => isTaskDueToday(task) && task.status === 'active');

            // Group today's tasks by time period
            const morningTasks = todaysTasks.filter(task => getTimePeriod(task.due_date) === 'morning');
            const afternoonTasks = todaysTasks.filter(task => getTimePeriod(task.due_date) === 'afternoon');
            const eveningTasks = todaysTasks.filter(task => getTimePeriod(task.due_date) === 'evening');
            const nightTasks = todaysTasks.filter(task => getTimePeriod(task.due_date) === 'night');

            // Tasks without a due date
            const noDueDateTasks = taskList.filter(task =>
                !task.due_date && task.status === 'active'
            );

            // Future tasks
            const upcomingTasks = taskList.filter(task =>
                task.due_date &&
                task.status === 'active' &&
                !isTaskDueToday(task) &&
                !isTaskOverdue(task)
            );

            // Completed tasks
            const completedTasks = taskList.filter(task => task.status === 'completed');

            // Add sections with icons if they have tasks
            if (overdueTasks.length > 0) {
                sections.push({
                    title: 'Overdue',
                    data: overdueTasks,
                    icon: 'alert-circle'
                });
            }

            // Morning section for today
            if (morningTasks.length > 0) {
                sections.push({
                    title: 'Morning',
                    data: morningTasks,
                    icon: 'sunny-outline'
                });
            }

            // Afternoon section for today
            if (afternoonTasks.length > 0) {
                sections.push({
                    title: 'Afternoon',
                    data: afternoonTasks,
                    icon: 'partly-sunny-outline'
                });
            }

            // Evening section for today
            if (eveningTasks.length > 0) {
                sections.push({
                    title: 'Evening',
                    data: eveningTasks,
                    icon: 'moon-outline'
                });
            }

            // Night section for today
            if (nightTasks.length > 0) {
                sections.push({
                    title: 'Night',
                    data: nightTasks,
                    icon: 'cloudy-night-outline'
                });
            }

            // If no time-based sections were created but we have today's tasks, group them together
            if (morningTasks.length === 0 && afternoonTasks.length === 0 &&
                eveningTasks.length === 0 && nightTasks.length === 0 &&
                todaysTasks.length > 0) {
                sections.push({
                    title: 'Today',
                    data: todaysTasks,
                    icon: 'today-outline'
                });
            }

            // No Due Date tasks
            if (noDueDateTasks.length > 0) {
                sections.push({
                    title: 'No Due Date',
                    data: noDueDateTasks,
                    icon: 'calendar-clear-outline'
                });
            }

            // Upcoming tasks
            if (upcomingTasks.length > 0) {
                sections.push({
                    title: 'Upcoming',
                    data: upcomingTasks,
                    icon: 'calendar-outline'
                });
            }

            // Completed tasks
            if (completedTasks.length > 0) {
                sections.push({
                    title: 'Completed',
                    data: completedTasks,
                    icon: 'checkmark-done-circle-outline'
                });
            }
        } else {
            // For other views, just use a single section with the filter name
            const title = filterType.charAt(0).toUpperCase() + filterType.slice(1);
            let icon = '';

            switch(filterType) {
                case 'active': icon = 'checkmark-circle-outline'; break;
                case 'completed': icon = 'checkmark-done-circle-outline'; break;
                case 'overdue': icon = 'alert-circle'; break;
                case 'upcoming': icon = 'calendar-outline'; break;
            }

            sections = [{
                title: `${title} Tasks`,
                data: filteredTasks,
                icon
            }];
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

            // Optimistic update
            setTasks(prevTasks =>
                prevTasks.map(t =>
                    t.id === task.id
                        ? {...t, status: newStatus, completed_at: newCompletedAt}
                        : t
                )
            );

            // Update sections
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
            // Revert optimistic update
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

    // Render section header with icon
    const renderSectionHeader = ({ section }: { section: { title: string, data: Task[], icon?: string } }) => (
        <View style={styles.sectionHeader}>
            {section.icon && (
                <Ionicons
                    name={section.icon as any}
                    size={18}
                    color={COLORS.primary}
                    style={styles.sectionIcon}
                />
            )}
            <Text style={styles.sectionHeaderText}>
                {section.title} {section.data.length > 0 && `(${section.data.length})`}
            </Text>

            {section.title === 'Overdue' && section.data.length > 0 && (
                <View style={styles.overdueBadge}>
                    <Ionicons name="alert-circle" size={14} color={COLORS.white} />
                    <Text style={styles.overdueBadgeText}>Action Needed</Text>
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
        width: 36,
        height: 36,
        borderRadius: 18,
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
        padding: SPACING.sm,
        backgroundColor: '#ffebee',
        marginHorizontal: SPACING.md,
        marginTop: SPACING.sm,
        borderRadius: 6,
        alignItems: 'center',
    },
    errorText: {
        color: COLORS.danger,
        marginBottom: SPACING.xs,
        ...Typography.bodyMedium,
        fontSize: 13,
    },
    retryButton: {
        backgroundColor: COLORS.danger,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: 4,
    },
    retryButtonText: {
        color: COLORS.white,
        fontWeight: FONTS.weight.semiBold,
        fontSize: 12,
    },
    filterContainer: {
        padding: SPACING.xs,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        zIndex: 2, // Ensure filter bar is above content
    },
    scrollableFilterContainer: {
        flexDirection: 'row',
        paddingVertical: 2,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: 16,
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
        paddingBottom: SPACING.md,
    },
    emptyList: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.md,
        backgroundColor: 'rgba(248, 249, 250, 0.95)',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    sectionIcon: {
        marginRight: SPACING.xs,
    },
    sectionHeaderText: {
        ...Typography.bodyMedium,
        color: COLORS.dark,
        fontWeight: FONTS.weight.semiBold,
        fontSize: 14,
    },
    overdueBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.danger,
        paddingVertical: 2,
        paddingHorizontal: SPACING.xs,
        borderRadius: 10,
        marginLeft: SPACING.sm,
    },
    overdueBadgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: FONTS.weight.medium,
        marginLeft: 2,
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