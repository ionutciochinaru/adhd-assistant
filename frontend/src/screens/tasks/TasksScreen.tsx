// frontend/src/screens/tasks/TasksScreen.tsx
import React, {useState, useEffect, useCallback, useRef} from 'react';
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
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {supabase} from '../../utils/supabase';
import {useAuth} from '../../context/AuthContext';
import TaskItem from '../../components/TaskItem';
import {Task} from '../../utils/supabase';
import {Ionicons} from '@expo/vector-icons';
import ScreenLayout from '../../components/ScreenLayout';
import {COLORS, SPACING, FONTS, Typography, CommonStyles, RADIUS, SHADOWS} from '../../utils/styles';
import SwipeableTaskItem from "../../components/SwipeableTaskItem";

const TasksScreen = () => {
    const navigation = useNavigation();
    const {user} = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [sectionsData, setSectionsData] = useState<{ title: string, data: Task[] }[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');
    const [error, setError] = useState<string | null>(null);

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(50)).current;

    // Fetch and process tasks
    const fetchTasks = async () => {
        if (!user) return;

        try {
            setRefreshing(true);
            setError(null);

            const {data, error} = await supabase
                .from('tasks')
                .select(`
                        *,
                        subtasks(*)
                    `)
                .eq('user_id', user.id)
                .order('created_at', {ascending: false});

            if (error) throw error;

            setTasks(data || []);
            processTaskSections(data || []);
        } catch (error: any) {
            console.error('Error fetching tasks:', error.message);
            setError('Failed to load tasks. Pull down to retry.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Process tasks into sections
    const processTaskSections = (taskList: Task[]) => {
        let filteredTasks: Task[] = [];

        switch (filter) {
            case 'active':
                filteredTasks = taskList.filter(task => task.status === 'active');
                break;
            case 'completed':
                filteredTasks = taskList.filter(task => task.status === 'completed');
                break;
            case 'overdue':
                filteredTasks = taskList.filter(task => {
                    if (task.status === 'completed') return false;
                    if (!task.due_date) return false;
                    return new Date(task.due_date) < new Date();
                });
                break;
            default:
                filteredTasks = taskList;
        }

        const sections = [
            {
                title: filter === 'all' ? 'All Tasks' :
                    filter === 'active' ? 'Active Tasks' :
                        filter === 'completed' ? 'Completed Tasks' :
                            'Overdue Tasks',
                data: filteredTasks
            }
        ];

        setSectionsData(sections);
    };

    // Lifecycle and animation effects
    useEffect(() => {
        fetchTasks();
    }, [user, filter]);

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true
            }),
            Animated.timing(translateYAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true
            })
        ]).start();
    }, []);

    // Task interaction handlers
    const handleTaskPress = (taskId: string) => {
        navigation.navigate('TaskDetail', {taskId});
    };

    const toggleTaskCompletion = async (task: Task) => {
        try {
            const newStatus = task.status === 'active' ? 'completed' : 'active';
            const {error} = await supabase
                .from('tasks')
                .update({
                    status: newStatus,
                    completed_at: newStatus === 'completed' ? new Date().toISOString() : null
                })
                .eq('id', task.id);

            if (error) throw error;

            // Optimistically update UI
            const updatedTasks = tasks.map(t =>
                t.id === task.id
                    ? {
                        ...t,
                        status: newStatus,
                        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
                    }
                    : t
            );

            setTasks(updatedTasks);
            processTaskSections(updatedTasks);
        } catch (error) {
            console.error('Error updating task status:', error);
            Alert.alert('Error', 'Failed to update task status');
        }
    };

    // Render empty state
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Image
                source={require('../../../assets/adaptive-icon.png')}
                style={styles.emptyImage}
                resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>No Tasks Found</Text>
            <Text style={styles.emptySubtitle}>
                {filter === 'all'
                    ? 'Start organizing your day by adding a task'
                    : `No ${filter} tasks at the moment`}
            </Text>
            <TouchableOpacity
                style={styles.addTaskButton}
                onPress={() => navigation.navigate('CreateTask')}
            >
                <Ionicons name="add" size={24} color={COLORS.white}/>
                <Text style={styles.addTaskButtonText}>Add New Task</Text>
            </TouchableOpacity>
        </View>
    );

    // Filter buttons
    const FilterButton = ({label, icon, isActive, onPress}) => (
        <TouchableOpacity
            style={[
                styles.filterButton,
                isActive && styles.activeFilterButton
            ]}
            onPress={onPress}
        >
            <Ionicons
                name={icon}
                size={16}
                color={isActive ? COLORS.primary : COLORS.textSecondary}
            />
            <Text
                style={[
                    styles.filterButtonText,
                    isActive && styles.activeFilterButtonText
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <ScreenLayout
            title="Tasks"
            showHeader={false}
        >
            <Animated.View
                style={[
                    styles.container,
                    {
                        opacity: fadeAnim,
                        transform: [{translateY: translateYAnim}]
                    }
                ]}
            >
                {/* Greeting and Stats Header */}
                <View style={styles.headerContainer}>
                    <View style={styles.greetingContainer}>
                        <Text style={styles.greeting}>Hello!</Text>
                        <Text style={styles.subGreeting}>
                            {user?.user_metadata?.name ? `Welcome, ${user.user_metadata.name}` : 'Let\'s organize your day'}
                        </Text>
                    </View>

                    <View style={styles.statsContainer}>
                        <View style={styles.statCard}>
                            <Ionicons
                                name="checkbox-outline"
                                size={24}
                                color={COLORS.primary}
                            />
                            <Text style={styles.statValue}>
                                {tasks.filter(t => t.status === 'active').length}
                            </Text>
                            <Text style={styles.statLabel}>Active Tasks</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Ionicons
                                name="pie-chart-outline"
                                size={24}
                                color={COLORS.lowPriority}
                            />
                            <Text style={styles.statValue}>
                                {tasks.length > 0
                                    ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)
                                    : 0}%
                            </Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </View>
                    </View>
                </View>

                {/* Filter Buttons */}
                <View style={styles.filterContainer}>
                    <FilterButton
                        label="All"
                        icon="list-outline"
                        isActive={filter === 'all'}
                        onPress={() => setFilter('all')}
                    />
                    <FilterButton
                        label="Active"
                        icon="checkbox-outline"
                        isActive={filter === 'active'}
                        onPress={() => setFilter('active')}
                    />
                    <FilterButton
                        label="Overdue"
                        icon="alert-circle"
                        isActive={filter === 'overdue'}
                        onPress={() => setFilter('overdue')}
                    />
                    <FilterButton
                        label="Completed"
                        icon="checkmark-done-circle-outline"
                        isActive={filter === 'completed'}
                        onPress={() => setFilter('completed')}
                    />
                </View>

                {/* Tasks List */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary}/>
                        <Text style={styles.loadingText}>Loading tasks...</Text>
                    </View>
                ) : (
                    <SectionList
                        sections={sectionsData}
                        keyExtractor={(item) => item.id}
                        renderItem={({item}) => (
                            <SwipeableTaskItem
                                task={item}
                                onPress={() => handleTaskPress(item.id)}
                                onTaskUpdate={(updatedTask) => {
                                    // Update the tasks list when a task is updated
                                    const updatedTasks = tasks.map(t =>
                                        t.id === updatedTask.id ? updatedTask : t
                                    );
                                    setTasks(updatedTasks);
                                    processTaskSections(updatedTasks);
                                }}
                                onDelete={(taskId) => {
                                    // Remove the deleted task from the list
                                    const updatedTasks = tasks.filter(t => t.id !== taskId);
                                    setTasks(updatedTasks);
                                    processTaskSections(updatedTasks);
                                }}
                            />
                        )}
                        ListEmptyComponent={renderEmptyState}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={fetchTasks}
                                colors={[COLORS.primary]}
                                tintColor={COLORS.primary}
                            />
                        }
                        contentContainerStyle={styles.tasksListContainer}
                    />
                )}

                {/* Add Task Button */}
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('CreateTask')}
                >
                    <Ionicons name="add" size={24} color={COLORS.white}/>
                </TouchableOpacity>
            </Animated.View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerContainer: {
        backgroundColor: COLORS.white,
        paddingHorizontal: SPACING.md,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.md,
        ...SHADOWS.small,
    },
    greetingContainer: {
        marginBottom: SPACING.md,
    },
    greeting: {
        ...Typography.h2,
        marginBottom: SPACING.xs,
    },
    subGreeting: {
        ...Typography.bodyMedium,
        color: COLORS.textSecondary,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.cardBlue,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginHorizontal: SPACING.xs,
        alignItems: 'center',
        ...SHADOWS.small,
    },
    statValue: {
        ...Typography.h3,
        marginTop: SPACING.xs,
    },
    statLabel: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs,
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.white,
        ...SHADOWS.small,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.round,
    },
    activeFilterButton: {
        backgroundColor: COLORS.primaryLight,
    },
    filterButtonText: {
        ...Typography.bodySmall,
        marginLeft: SPACING.xs,
        color: COLORS.textSecondary,
    },
    activeFilterButtonText: {
        color: COLORS.primary,
        fontWeight: FONTS.weight.semiBold,
    },
    tasksListContainer: {
        paddingBottom: SPACING.xxl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    addTaskButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.xl,
        borderRadius: RADIUS.round,
        alignSelf: 'center',
        ...SHADOWS.medium,
    },
    addTaskButtonText: {
        ...Typography.bodyMedium,
        color: COLORS.white,
        fontWeight: FONTS.weight.semiBold,
        marginLeft: SPACING.sm,
    },
    addButton: {
        position: 'absolute',
        bottom: SPACING.xl,
        right: SPACING.xl,
        width: 60,
        height: 60,
        borderRadius: RADIUS.round,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
    },
});

export default TasksScreen;