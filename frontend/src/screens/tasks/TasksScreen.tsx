import React, { useState, useEffect, useCallback } from 'react';
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
    Image, Dimensions
} from 'react-native';
import {RouteProp, useFocusEffect, useNavigation, useRoute} from '@react-navigation/native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { Task } from '../../utils/supabase';
import { Ionicons } from '@expo/vector-icons';
import ScreenLayout from '../../components/ScreenLayout';
import TaskItem from '../../components/TaskItem';
import TaskOptionModal from '../../components/TaskOptionModal';
import { COLORS, SPACING, FONTS, Typography, RADIUS, SHADOWS } from '../../utils/styles';
import { normalizeDate } from '../../utils/dateUtils';
import SingleRowCalendar from "../../components/SingleRowCalendar";
import {MarkedDates} from "react-native-calendars/src/types";
import moment from "moment";
import {TasksStackParamList} from "../../navigation/TasksNavigator";
import {StackNavigationProp} from "@react-navigation/stack";

const TasksScreen = () => {
    const navigation = useNavigation<StackNavigationProp<TasksStackParamList>>();
    const route = useRoute<RouteProp<TasksStackParamList, 'TasksList'>>();
    const { user } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [sectionsData, setSectionsData] = useState<{ title: string, data: Task[] }[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');
    const [error, setError] = useState<string | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [optionsModalVisible, setOptionsModalVisible] = useState(false);

    // NEW: Calendar state
    const [selectedDate, setSelectedDate] = useState(normalizeDate(new Date().toISOString()));
    const [markedDates, setMarkedDates] = useState<MarkedDates>({});
    const [completionRate, setCompletionRate] = useState(0);
    const [motivationalMessage, setMotivationalMessage] = useState('');

    // Animation values
    const fadeAnim = useState(new Animated.Value(0))[0];
    const translateYAnim = useState(new Animated.Value(50))[0];
    const progressAnim = useState(new Animated.Value(0))[0];

    // Fetch and process tasks
    const fetchTasks = async () => {
        if (!user) return;

        try {
            setRefreshing(true);
            setError(null);

            const { data, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    subtasks(*)
                `)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setTasks(data || []);
            processTaskSections(data || []);
            updateMarkedDates(data || []);
            calculateCompletionRate(data || [], selectedDate);
        } catch (error) {
            console.error('Error fetching tasks:', error.message);
            setError('Failed to load tasks. Pull down to retry.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Process tasks into sections based on the active filter and selected date
    const processTaskSections = (taskList: Task[]) => {
        // First filter by selected date
        const dateFilteredTasks = taskList.filter(task => {
            if (!task.due_date) return false;
            return normalizeDate(task.due_date) === selectedDate;
        });

        // Then apply status filter
        let filteredTasks: Task[] = [];

        switch (filter) {
            case 'active':
                filteredTasks = dateFilteredTasks.filter(task => task.status === 'active');
                break;
            case 'completed':
                filteredTasks = dateFilteredTasks.filter(task => task.status === 'completed');
                break;
            case 'overdue':
                filteredTasks = dateFilteredTasks.filter(task => {
                    if (task.status === 'completed') return false;
                    if (!task.due_date) return false;
                    return new Date(task.due_date) < new Date();
                });
                break;
            default:
                filteredTasks = dateFilteredTasks;
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

    // NEW: Update marked dates for calendar
    const updateMarkedDates = (taskList: Task[]) => {
        const marks: MarkedDates = {};

        // Group tasks by date
        taskList.forEach(task => {
            if (!task.due_date) return;

            const date = normalizeDate(task.due_date);
            if (!date) return;

            // If this date is already in marks, update it
            if (marks[date]) {
                // If there are no dots yet, create the array
                if (!marks[date].dots) {
                    marks[date].dots = [];
                }

                // Add a dot for this task, color based on priority and status
                const dotColor = task.status === 'completed' ? COLORS.success :
                    task.priority === 'high' ? COLORS.highPriority :
                        task.priority === 'medium' ? COLORS.mediumPriority :
                            COLORS.lowPriority;

                marks[date].dots.push({ color: dotColor });
            } else {
                // First task for this date
                const dotColor = task.status === 'completed' ? COLORS.success :
                    task.priority === 'high' ? COLORS.highPriority :
                        task.priority === 'medium' ? COLORS.mediumPriority :
                            COLORS.lowPriority;

                marks[date] = {
                    marked: true,
                    dots: [{ color: dotColor }]
                };
            }
        });

        // Mark selected date
        if (selectedDate) {
            marks[selectedDate] = {
                ...marks[selectedDate],
                selected: true,
                selectedColor: COLORS.primary
            };
        }

        setMarkedDates(marks);
    };

    // NEW: Calculate completion rate
    const calculateCompletionRate = (taskList: Task[], date: string) => {
        // Filter tasks for selected date
        const dateFilteredTasks = taskList.filter(task => {
            if (!task.due_date) return false;
            return normalizeDate(task.due_date) === date;
        });

        if (dateFilteredTasks.length > 0) {
            const completedTasks = dateFilteredTasks.filter(task => task.status === 'completed').length;
            const rate = Math.round((completedTasks / dateFilteredTasks.length) * 100);
            setCompletionRate(rate);

            // Update motivational message based on completion rate
            updateMotivationalMessage(rate);

            // Animate progress bar
            Animated.timing(progressAnim, {
                toValue: rate,
                duration: 800,
                useNativeDriver: false
            }).start();
        } else {
            setCompletionRate(0);
            setMotivationalMessage("No tasks for today yet!");
            Animated.timing(progressAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: false
            }).start();
        }
    };

    // NEW: Update motivational message based on completion rate
    const updateMotivationalMessage = (rate: number) => {
        if (rate === 0) {
            setMotivationalMessage("Let's get started! You got this!");
        } else if (rate < 25) {
            setMotivationalMessage("Progress begins with a single step. Keep going!");
        } else if (rate < 50) {
            setMotivationalMessage("You're making great progress. Keep the momentum going!");
        } else if (rate < 75) {
            setMotivationalMessage("Getting closer! You've accomplished so much today!");
        } else if (rate < 100) {
            setMotivationalMessage("Almost there! Just a few more tasks to go!");
        } else {
            setMotivationalMessage("Amazing job! You've completed all your tasks for the day! 🎉");
        }
    };

    // Lifecycle and animation effects
    useEffect(() => {
        fetchTasks();
    }, [user]);

    // NEW: Update tasks when date or filter changes
    useEffect(() => {
        if (tasks.length > 0) {
            processTaskSections(tasks);
            updateMarkedDates(tasks);
            calculateCompletionRate(tasks, selectedDate);
        }
    }, [selectedDate, filter]);

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

    // Refresh when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            // Get the date to select from navigation params
            const returnedDate = route.params?.selectDate;
            if (returnedDate) {
                setSelectedDate(returnedDate);
                // Clear the parameter to avoid reselecting on subsequent focus events
                navigation.setParams({ selectDate: undefined });
            }
        }, [route.params?.selectDate])
    );

    // Task interaction handlers
    const handleTaskPress = (taskId: string) => {
        navigation.navigate('TaskDetail', { taskId });
    };

    // Start Pomodoro timer for a task
    const handlePomodoroStart = (task: Task) => {
        navigation.navigate('Pomodoro', { task });
    };

    // Show options for a task
    const handleOptionsPress = (task: Task) => {
        setSelectedTask(task);
        setOptionsModalVisible(true);
    };

    // Edit task
    const handleEditTask = () => {
        if (!selectedTask) return;
        setOptionsModalVisible(false);
        navigation.navigate('TaskDetail', { taskId: selectedTask.id });
    };

    // Delete task and its subtasks
    const handleDeleteTask = async () => {
        if (!selectedTask) return;

        try {
            setOptionsModalVisible(false);

            // Delete the task (subtasks will be deleted via cascade)
            const { error } = await supabase
                .from('tasks')
                .delete()
                .eq('id', selectedTask.id);

            if (error) throw error;

            // Update the UI optimistically
            const updatedTasks = tasks.filter(t => t.id !== selectedTask.id);
            setTasks(updatedTasks);
            processTaskSections(updatedTasks);
            updateMarkedDates(updatedTasks);
            calculateCompletionRate(updatedTasks, selectedDate);

            // Show success message
            Alert.alert('Success', 'Task deleted successfully');
        } catch (error) {
            console.error('Error deleting task:', error.message);
            Alert.alert('Error', 'Failed to delete task');
        }
    };

    // Toggle task completion status
    const handleToggleTaskCompletion = async () => {
        if (!selectedTask) return;

        try {
            const newStatus = selectedTask.status === 'active' ? 'completed' : 'active';

            // Update the task status optimistically in UI
            const updatedTasks = tasks.map(task =>
                task.id === selectedTask.id
                    ? {
                        ...task,
                        status: newStatus,
                        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                    }
                    : task
            );

            setTasks(updatedTasks);
            processTaskSections(updatedTasks);
            updateMarkedDates(updatedTasks);
            calculateCompletionRate(updatedTasks, selectedDate);

            // Update in database
            const { error } = await supabase
                .from('tasks')
                .update({
                    status: newStatus,
                    completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                })
                .eq('id', selectedTask.id);

            if (error) throw error;

            // Show feedback
            const message = newStatus === 'completed' ? 'Task completed!' : 'Task marked as active';
            Alert.alert('Success', message);

        } catch (error) {
            console.error('Error updating task status:', error.message);
            Alert.alert('Error', 'Failed to update task status');
            // Revert optimistic update on error
            fetchTasks();
        }
    };

    // NEW: Handle date selection in calendar
    const handleDateSelect = (date) => {
        setSelectedDate(date.dateString);
    };

    // Get count for filter badges
    const getFilterCount = (filterType: 'all' | 'active' | 'completed' | 'overdue'): number => {
        // Filter tasks for the selected date first
        const dateFilteredTasks = tasks.filter(task => {
            if (!task.due_date) return false;
            return normalizeDate(task.due_date) === selectedDate;
        });

        // Then count by filter type
        switch (filterType) {
            case 'active':
                return dateFilteredTasks.filter(task => task.status === 'active').length;
            case 'completed':
                return dateFilteredTasks.filter(task => task.status === 'completed').length;
            case 'overdue':
                return dateFilteredTasks.filter(task => {
                    if (task.status === 'completed') return false;
                    if (!task.due_date) return false;
                    return new Date(task.due_date) < new Date();
                }).length;
            default: // 'all'
                return dateFilteredTasks.length;
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
                {selectedDate === normalizeDate(new Date().toISOString())
                    ? 'Start organizing your day by adding a task'
                    : `No tasks scheduled for this date`}
            </Text>
            <TouchableOpacity
                style={styles.addTaskButton}
                onPress={() => navigation.navigate('CreateTask', { selectedDate })}
            >
                <Ionicons name="add" size={24} color={COLORS.white} />
                <Text style={styles.addTaskButtonText}>Add New Task</Text>
            </TouchableOpacity>
        </View>
    );

    // Filter buttons
    const FilterButton = ({ label, icon, type, isActive, onPress }) => (
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
            {getFilterCount(type) > 0 && (
                <View style={[
                    styles.filterBadge,
                    isActive && styles.activeFilterBadge
                ]}>
                    <Text style={[
                        styles.filterBadgeText,
                        isActive && styles.activeFilterBadgeText
                    ]}>
                        {getFilterCount(type)}
                    </Text>
                </View>
            )}
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
                        transform: [{ translateY: translateYAnim }]
                    }
                ]}
            >
                {/* Calendar */}
                <SingleRowCalendar
                    selectedDate={selectedDate}
                    onDateSelect={(date) => setSelectedDate(date.dateString)}
                    markedDates={markedDates}
                />
                {/* Progress section */}
                <View style={styles.progressContainer}>
                    <View style={styles.progressHeader}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressTitle}>
                                {selectedDate === moment().format('YYYY-MM-DD') ? "Today's Progress" : `Progress for ${moment(selectedDate).format('MMMM D')}`}
                            </Text>
                        </View>
                        <Text style={styles.progressPercentage}>{completionRate}%</Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                        <Animated.View
                            style={[
                                styles.progressBar,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%']
                                    })
                                },
                                completionRate === 100 ? styles.progressBarComplete : null
                            ]}
                        />
                    </View>

                    <Text style={styles.motivationalMessage}>{motivationalMessage}</Text>
                </View>

                {/* Filter Buttons */}
                <View style={styles.filterContainer}>
                    <FilterButton
                        label="All"
                        icon="list-outline"
                        type="all"
                        isActive={filter === 'all'}
                        onPress={() => setFilter('all')}
                    />
                    <FilterButton
                        label="Active"
                        icon="checkbox-outline"
                        type="active"
                        isActive={filter === 'active'}
                        onPress={() => setFilter('active')}
                    />
                    <FilterButton
                        label="Overdue"
                        icon="alert-circle"
                        type="overdue"
                        isActive={filter === 'overdue'}
                        onPress={() => setFilter('overdue')}
                    />
                    <FilterButton
                        label="Done"
                        icon="checkmark-done-circle-outline"
                        type="completed"
                        isActive={filter === 'completed'}
                        onPress={() => setFilter('completed')}
                    />
                </View>

                {/* Tasks List */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={styles.loadingText}>Loading tasks...</Text>
                    </View>
                ) : (
                    <SectionList
                        sections={sectionsData}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TaskItem
                                task={item}
                                onPress={() => handleTaskPress(item.id)}
                                onPomodoroStart={handlePomodoroStart}
                                onOptionsPress={() => handleOptionsPress(item)}
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
                    onPress={() => navigation.navigate('CreateTask', { selectedDate })}
                >
                    <Ionicons name="add" size={24} color={COLORS.white} />
                </TouchableOpacity>

                {/* Options Modal */}
                <TaskOptionModal
                    visible={optionsModalVisible}
                    task={selectedTask}
                    onClose={() => setOptionsModalVisible(false)}
                    onEdit={handleEditTask}
                    onDelete={() => {
                        Alert.alert(
                            'Delete Task',
                            'Are you sure you want to delete this task?',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: handleDeleteTask }
                            ]
                        );
                    }}
                    onStartPomodoro={() => {
                        setOptionsModalVisible(false);
                        if (selectedTask) {
                            handlePomodoroStart(selectedTask);
                        }
                    }}
                    onCompleteTask={handleToggleTaskCompletion}
                />
            </Animated.View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    calendarContainer: {
        backgroundColor: COLORS.white,
        paddingBottom: SPACING.sm,
        ...SHADOWS.small,
        height: 100,
        overflow: 'hidden', // Prevent content from spilling out
    },
    progressContainer: {
        backgroundColor: COLORS.white,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        marginBottom: SPACING.sm,
        ...SHADOWS.small,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    progressTitle: {
        ...Typography.bodyMedium,
        fontWeight: '600',
    },
    progressPercentage: {
        ...Typography.bodyMedium,
        fontWeight: '700',
        color: COLORS.primary,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: COLORS.primaryLight,
        borderRadius: 4,
        marginBottom: SPACING.sm,
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 4,
    },
    progressBarComplete: {
        backgroundColor: COLORS.success,
    },
    motivationalMessage: {
        ...Typography.bodyMedium,
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    daySegmentContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.white,
        marginBottom: SPACING.sm,
        padding: SPACING.xs,
        ...SHADOWS.small,
    },
    daySegmentOption: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: SPACING.xs,
        borderRadius: RADIUS.md,
    },
    daySegmentText: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.white,
        marginBottom: SPACING.sm,
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
    filterBadge: {
        backgroundColor: COLORS.primaryLight,
        borderRadius: RADIUS.round,
        paddingHorizontal: 6,
        paddingVertical: 2,
        marginLeft: SPACING.xs,
        minWidth: 20,
        alignItems: 'center',
    },
    activeFilterBadge: {
        backgroundColor: COLORS.primary,
    },
    filterBadgeText: {
        ...Typography.tiny,
        color: COLORS.textSecondary,
        fontWeight: FONTS.weight.semiBold,
    },
    activeFilterBadgeText: {
        color: COLORS.white,
    },
    tasksListContainer: {
        paddingBottom: SPACING.xxl,
        flexGrow: 1,
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