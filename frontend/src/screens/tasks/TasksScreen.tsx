// frontend/src/screens/tasks/TasksScreen.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SectionList,
    ActivityIndicator,
    Alert,
    Animated,
    RefreshControl,
    Image
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import TaskItem from '../../components/TaskItem';
import { Task } from '../../utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../../components/ScreenLayout';
import { COLORS, SPACING, FONTS, Typography, CommonStyles, RADIUS, SHADOWS } from '../../utils/styles';

// For smooth animations
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const TasksScreen = () => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [sectionsData, setSectionsData] = useState<{title: string, data: Task[], icon?: string}[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue' | 'upcoming'>('all');
    const [error, setError] = useState<string | null>(null);

    // Animation values
    const filterBarOpacity = useRef(new Animated.Value(1)).current;
    const addButtonScale = useRef(new Animated.Value(1)).current;
    const headerHeight = useRef(new Animated.Value(180)).current;
    const headerOpacity = useRef(new Animated.Value(1)).current;

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

            // Get today's tasks
            const todaysTasks = taskList.filter(task => isTaskDueToday(task) && task.status === 'active');

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

            // Today's tasks
            if (todaysTasks.length > 0) {
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
            <Image
                source={require('../../../assets/adaptive-icon.png')}
                style={styles.emptyImage}
                resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>No tasks found</Text>
            <Text style={styles.emptySubtitle}>
                {filter === 'all'
                    ? 'Get started by adding your first task'
                    : `No ${filter} tasks found`}
            </Text>
            <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={() => navigation.navigate('CreateTask' as any)}
            >
                <Ionicons name="add" size={24} color={COLORS.white} />
                <Text style={styles.emptyAddButtonText}>Add New Task</Text>
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
                <View style={styles.sectionIconContainer}>
                    <Ionicons
                        name={section.icon as any}
                        size={16}
                        color={COLORS.white}
                    />
                </View>
            )}
            <Text style={styles.sectionHeaderText}>
                {section.title} {section.data.length > 0 && `(${section.data.length})`}
            </Text>

            {section.title === 'Overdue' && section.data.length > 0 && (
                <View style={styles.overdueBadge}>
                    <Ionicons name="alert-circle" size={12} color={COLORS.white} />
                    <Text style={styles.overdueBadgeText}>Action Needed</Text>
                </View>
            )}
        </View>
    );

    // Handle pull-to-refresh
    const handleRefresh = () => {
        fetchTasks();
    };

    // Get total active tasks count
    const activeTasks = tasks.filter(task => task.status === 'active').length;

    // Get completed tasks percentage
    const completedPercentage = tasks.length > 0
        ? Math.round((tasks.filter(task => task.status === 'completed').length / tasks.length) * 100)
        : 0;

    return (
        <ScreenLayout
            title="Tasks"
            rightComponent={renderAddButton()}
            showHeader={false}
        >
            <View style={styles.container}>
                {/* Custom header with greeting and summary */}
                <Animated.View style={[styles.customHeader, { height: headerHeight, opacity: headerOpacity }]}>
                    <Text style={styles.greeting}>Hello!</Text>
                    <Text style={styles.welcomeText}>Let's organize your tasks</Text>

                    <View style={styles.summaryCards}>
                        <View style={[styles.summaryCard, { backgroundColor: COLORS.cardBlue }]}>
                            <View style={styles.summaryIconContainer}>
                                <Ionicons name="checkbox-outline" size={20} color={COLORS.primary} />
                            </View>
                            <Text style={styles.summaryValue}>{activeTasks}</Text>
                            <Text style={styles.summaryLabel}>Active Tasks</Text>
                        </View>

                        <View style={[styles.summaryCard, { backgroundColor: COLORS.cardGreen }]}>
                            <View style={[styles.summaryIconContainer, { backgroundColor: COLORS.lowPriority }]}>
                                <Ionicons name="pie-chart-outline" size={20} color={COLORS.white} />
                            </View>
                            <Text style={styles.summaryValue}>{completedPercentage}%</Text>
                            <Text style={styles.summaryLabel}>Completed</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Task filters */}
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

                {/* Error message */}
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

                {/* Loading state */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading your tasks...</Text>
                    </View>
                ) : (
                    /* Task list */
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
                        onScroll={(event) => {
                            // Collapse header on scroll
                            const scrollY = event.nativeEvent.contentOffset.y;
                            const newHeight = Math.max(0, 180 - scrollY);
                            const newOpacity = Math.max(0, 1 - (scrollY / 180));

                            headerHeight.setValue(newHeight);
                            headerOpacity.setValue(newOpacity);
                        }}
                        scrollEventThrottle={16}
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
        { key: 'active', label: 'Active', icon: 'checkbox-outline' },
        { key: 'completed', label: 'Completed', icon: 'checkmark-circle' }
    ];

    return (
        <View style={styles.tabBar}>
            {filters.map(filter => (
                <TouchableOpacity
                    key={filter.key}
                    style={[
                        styles.tab,
                        currentFilter === filter.key && styles.activeTab
                    ]}
                    onPress={() => onFilterChange(filter.key)}
                >
                    <Ionicons
                        name={filter.icon as any}
                        size={16}
                        color={currentFilter === filter.key ? COLORS.primary : COLORS.textSecondary}
                        style={styles.tabIcon}
                    />
                    <Text style={[
                        styles.tabText,
                        currentFilter === filter.key && styles.activeTabText
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
        backgroundColor: COLORS.background,
    },
    customHeader: {
        backgroundColor: COLORS.white,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.md,
        ...SHADOWS.small,
    },
    greeting: {
        ...Typography.h2,
        marginBottom: SPACING.xs,
    },
    welcomeText: {
        ...Typography.bodyMedium,
        color: COLORS.textSecondary,
        marginBottom: SPACING.lg,
    },
    summaryCards: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    summaryCard: {
        flex: 1,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        marginRight: SPACING.sm,
        ...SHADOWS.small,
    },
    summaryIconContainer: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.sm,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight,
        marginBottom: SPACING.sm,
    },
    summaryValue: {
        ...Typography.h3,
        marginBottom: SPACING.xxs,
    },
    summaryLabel: {
        ...Typography.bodySmall,
    },
    addButton: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.round,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    errorContainer: {
        backgroundColor: COLORS.cardRed,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.sm,
        padding: SPACING.sm,
        borderRadius: RADIUS.md,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    errorText: {
        ...Typography.bodySmall,
        color: COLORS.danger,
        flex: 1,
    },
    retryButton: {
        backgroundColor: COLORS.danger,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.sm,
    },
    retryButtonText: {
        ...Typography.captionBold,
        color: COLORS.white,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        marginHorizontal: SPACING.md,
        marginVertical: SPACING.sm,
        borderRadius: RADIUS.lg,
        padding: SPACING.xs,
        ...SHADOWS.small,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.md,
        flexDirection: 'row',
    },
    tabIcon: {
        marginRight: SPACING.xxs,
    },
    activeTab: {
        backgroundColor: COLORS.primaryLight,
    },
    tabText: {
        ...Typography.caption,
        color: COLORS.textSecondary,
    },
    activeTabText: {
        ...Typography.captionBold,
        color: COLORS.primary,
    },
    filterContainer: {
        marginBottom: SPACING.sm,
    },
    tasksList: {
        paddingBottom: SPACING.xl,
    },
    emptyList: {
        flexGrow: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        backgroundColor: COLORS.background,
        marginVertical: SPACING.xs,
    },
    sectionIconContainer: {
        width: 24,
        height: 24,
        borderRadius: RADIUS.sm,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.xs,
    },
    sectionHeaderText: {
        ...Typography.bodyMedium,
        fontWeight: '600',
    },
    overdueBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.danger,
        paddingVertical: SPACING.xxs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.round,
        marginLeft: SPACING.sm,
    },
    overdueBadgeText: {
        ...Typography.tiny,
        color: COLORS.white,
        fontWeight: '500',
        marginLeft: 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: SPACING.xxl,
    },
    loadingText: {
        ...Typography.bodyMedium,
        color: COLORS.textSecondary,
        marginTop: SPACING.md,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    emptyImage: {
        width: 120,
        height: 120,
        marginBottom: SPACING.md,
        opacity: 0.7,
    },
    emptyTitle: {
        ...Typography.h3,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    emptySubtitle: {
        ...Typography.bodyMedium,
        color: COLORS.textTertiary,
        textAlign: 'center',
        marginBottom: SPACING.xl,
    },
    emptyAddButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.round,
        ...SHADOWS.medium,
    },
    emptyAddButtonText: {
        ...Typography.bodyMedium,
        color: COLORS.white,
        fontWeight: '600',
        marginLeft: SPACING.sm,
    },
});

export default TasksScreen;