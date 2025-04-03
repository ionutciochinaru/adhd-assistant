// frontend/src/screens/tasks/TaskDetailScreen.tsx
import React, {useState, useEffect, useRef} from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Switch,
    TextInput,
    Platform,
    Animated,
    Easing,
    KeyboardAvoidingView,
} from 'react-native';
import {StackScreenProps} from '@react-navigation/stack';
import {supabase} from '../../utils/supabase';
import {useAuth} from '../../context/AuthContext';
import {Task, Subtask} from '../../utils/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import {useTaskNotifications} from '../../hooks/useTaskNotifications';
import BackButton from "../../components/BackButton";
import ActionButtons from "../../components/ActionButtons";
import ScreenLayout from '../../components/ScreenLayout';
import {COLORS, SPACING, FONTS, Typography, CommonStyles} from '../../utils/styles';
import {Ionicons} from '@expo/vector-icons';

// Navigation types
type TasksStackParamList = {
    TasksList: undefined;
    CreateTask: undefined;
    TaskDetail: { taskId: string };
};

type Props = StackScreenProps<TasksStackParamList, 'TaskDetail'>;

const TaskDetailScreen = ({route, navigation}: Props) => {
    const {taskId} = route.params;
    const {user} = useAuth();
    const [task, setTask] = useState<Task | null>(null);
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedTitle, setEditedTitle] = useState('');
    const [editedDescription, setEditedDescription] = useState('');
    const [editedPriority, setEditedPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [newSubtask, setNewSubtask] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [editedDueDate, setEditedDueDate] = useState<Date | null>(null);
    const [subtaskCompletion, setSubtaskCompletion] = useState<Record<string, boolean>>({});
    const {scheduleTaskNotification, cancelTaskNotification} = useTaskNotifications();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;
    const checkboxAnim = useRef<Record<string, Animated.Value>>({});

    // Helper for calculating due date status
    const getDueStatus = () => {
        if (!task?.due_date) return {isOverdue: false, isDueSoon: false};

        const dueDate = new Date(task.due_date);
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setHours(now.getHours() + 24);

        const isOverdue = dueDate < now && task.status !== 'completed';
        const isDueSoon = dueDate >= now && dueDate <= tomorrow && task.status !== 'completed';

        return {isOverdue, isDueSoon};
    };

    // Calculate remaining time in human-readable format
    const formatRemainingTime = () => {
        if (!task?.due_date) return null;

        const dueDate = new Date(task.due_date);
        const now = new Date();

        // For completed tasks, calculate time between completion and due date
        if (task.status === 'completed' && task.completed_at) {
            const completedDate = new Date(task.completed_at);
            const diffMs = dueDate.getTime() - completedDate.getTime();

            if (diffMs < 0) {
                // Completed after due date
                const overdueDiffMs = Math.abs(diffMs);
                const overdueDiffHrs = Math.floor(overdueDiffMs / (1000 * 60 * 60));

                if (overdueDiffHrs < 24) {
                    return `Completed ${overdueDiffHrs} hour${overdueDiffHrs !== 1 ? 's' : ''} late`;
                } else {
                    const overdueDiffDays = Math.floor(overdueDiffHrs / 24);
                    return `Completed ${overdueDiffDays} day${overdueDiffDays !== 1 ? 's' : ''} late`;
                }
            } else {
                // Completed before due date
                const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

                if (diffHrs < 24) {
                    return `Completed ${diffHrs} hour${diffHrs !== 1 ? 's' : ''} early`;
                } else {
                    const diffDays = Math.floor(diffHrs / 24);
                    return `Completed ${diffDays} day${diffDays !== 1 ? 's' : ''} early`;
                }
            }
        }

        // For active tasks
        if (dueDate < now) {
            // Task is overdue
            const diffMs = now.getTime() - dueDate.getTime();
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

            if (diffHrs < 24) {
                return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} overdue`;
            } else {
                const diffDays = Math.floor(diffHrs / 24);
                return `${diffDays} day${diffDays !== 1 ? 's' : ''} overdue`;
            }
        } else {
            // Task is upcoming
            const diffMs = dueDate.getTime() - now.getTime();
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));

            if (diffHrs < 24) {
                return `${diffHrs} hour${diffHrs !== 1 ? 's' : ''} remaining`;
            } else {
                const diffDays = Math.floor(diffHrs / 24);
                return `${diffDays} day${diffDays !== 1 ? 's' : ''} remaining`;
            }
        }
    };

    // Format the due date in a human-readable way
    const formatDueDate = (dateString?: string | null) => {
        if (!dateString) return 'No due date';

        const date = new Date(dateString);
        return date.toLocaleString(undefined, {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Calculate completion percentage
    const calculateCompletion = () => {
        if (!subtasks.length) return 0;
        const completed = subtasks.filter(subtask => subtask.status === 'completed').length;
        return Math.round((completed / subtasks.length) * 100);
    };

    // Set up real-time subscription for task and subtasks
    useEffect(() => {
        if (!taskId || !user) return;

        console.log('Setting up real-time subscription for task and subtasks');

        // Subscribe to changes in the task
        const taskSubscription = supabase
            .channel('task-detail-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for all changes
                    schema: 'public',
                    table: 'tasks',
                    filter: `id=eq.${taskId}`,
                },
                (payload) => {
                    console.log('Task update received:', payload.eventType);
                    fetchTaskDetails();
                }
            )
            .subscribe();

        // Subscribe to changes in the subtasks
        const subtasksSubscription = supabase
            .channel('subtasks-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for all changes
                    schema: 'public',
                    table: 'subtasks',
                    filter: `task_id=eq.${taskId}`,
                },
                (payload) => {
                    console.log('Subtask update received:', payload.eventType);
                    fetchTaskDetails();
                }
            )
            .subscribe();

        // Clean up subscriptions on unmount
        return () => {
            supabase.removeChannel(taskSubscription);
            supabase.removeChannel(subtasksSubscription);
        };
    }, [taskId, user]);

    // Load the task and its subtasks on component mount
    useEffect(() => {
        fetchTaskDetails();
    }, [taskId]);

    // Run fade-in animation when task loads
    useEffect(() => {
        if (task) {
            // Animate task details fade in
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }).start();

            // Animate progress bar
            Animated.timing(progressAnim, {
                toValue: calculateCompletion(),
                duration: 800,
                delay: 300,
                useNativeDriver: false,
                easing: Easing.out(Easing.cubic),
            }).start();
        }
    }, [task, subtasks]);

    // Initialize checkbox animations for subtasks
    useEffect(() => {
        const newAnimMap: Record<string, Animated.Value> = {};

        subtasks.forEach(subtask => {
            // Create animation if not exists, or use existing
            if (!checkboxAnim.current[subtask.id]) {
                newAnimMap[subtask.id] = new Animated.Value(subtask.status === 'completed' ? 1 : 0);
            } else {
                newAnimMap[subtask.id] = checkboxAnim.current[subtask.id];

                // Update animation if status changed
                if ((subtask.status === 'completed' && newAnimMap[subtask.id].__getValue() === 0) ||
                    (subtask.status === 'active' && newAnimMap[subtask.id].__getValue() === 1)) {
                    Animated.timing(newAnimMap[subtask.id], {
                        toValue: subtask.status === 'completed' ? 1 : 0,
                        duration: 300,
                        useNativeDriver: false,
                    }).start();
                }
            }
        });

        checkboxAnim.current = newAnimMap;
    }, [subtasks]);

    // Fetch task details and subtasks from Supabase
    const fetchTaskDetails = async () => {
        try {
            setLoading(true);

            // Fetch the task
            const {data: taskData, error: taskError} = await supabase
                .from('tasks')
                .select('*')
                .eq('id', taskId)
                .eq('user_id', user?.id)
                .single();

            if (taskError) throw taskError;

            // Fetch the subtasks
            const {data: subtasksData, error: subtasksError} = await supabase
                .from('subtasks')
                .select('*')
                .eq('task_id', taskId)
                .order('created_at', {ascending: true});

            if (subtasksError) throw subtasksError;

            setTask(taskData);
            setSubtasks(subtasksData || []);
            setEditedTitle(taskData.title);
            setEditedDescription(taskData.description || '');
            setEditedPriority(taskData.priority);
            setEditedDueDate(taskData.due_date ? new Date(taskData.due_date) : null);

            // Build subtask completion state
            const completionState: Record<string, boolean> = {};
            subtasksData?.forEach(subtask => {
                completionState[subtask.id] = subtask.status === 'completed';
            });
            setSubtaskCompletion(completionState);
        } catch (error: any) {
            console.error('Error fetching task details:', error.message);
            Alert.alert('Error', 'Failed to load task details');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    // Handle date change
    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios'); // Keep open on iOS, close on Android
        if (selectedDate) {
            if (editedDueDate) {
                // Preserve the time part of the existing date
                selectedDate.setHours(editedDueDate.getHours());
                selectedDate.setMinutes(editedDueDate.getMinutes());
            }
            setEditedDueDate(selectedDate);

            // Show time picker on Android after date is selected
            if (Platform.OS === 'android') {
                setShowTimePicker(true);
            }
        }
    };

    // Handle time change
    const onTimeChange = (event: any, selectedTime?: Date) => {
        setShowTimePicker(Platform.OS === 'ios'); // Keep open on iOS, close on Android

        if (selectedTime && editedDueDate) {
            // Combine the selected date with the selected time
            const newDateTime = new Date(editedDueDate);
            newDateTime.setHours(selectedTime.getHours());
            newDateTime.setMinutes(selectedTime.getMinutes());
            setEditedDueDate(newDateTime);
        }
    };

    // Toggle task completion status
    const toggleTaskCompletion = async () => {
        if (!task) return;

        try {
            setUpdating(true);
            const newStatus = task.status === 'active' ? 'completed' : 'active';

            // Optimistic update
            setTask({
                ...task,
                status: newStatus,
                completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
            });

            if (newStatus === 'completed') {
                // Cancel notification if task is completed
                await cancelTaskNotification(task.id);
            } else if (newStatus === 'active' && task.due_date) {
                // Reschedule notification if task is reactivated and has a due date
                await scheduleTaskNotification({
                    ...task,
                    status: 'active'
                });
            }

            // Update in database
            const {error} = await supabase
                .from('tasks')
                .update({
                    status: newStatus,
                    completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                })
                .eq('id', task.id);

            if (error) throw error;

            // Animate progress bar
            Animated.timing(progressAnim, {
                toValue: calculateCompletion(),
                duration: 600,
                useNativeDriver: false,
                easing: Easing.out(Easing.cubic),
            }).start();
        } catch (error: any) {
            console.error('Error updating task status:', error.message);
            Alert.alert('Error', 'Failed to update task status');
            // Revert optimistic update
            fetchTaskDetails();
        } finally {
            setUpdating(false);
        }
    };

    // Toggle subtask completion status
    const toggleSubtaskCompletion = async (subtask: Subtask) => {
        try {
            const newStatus = subtask.status === 'active' ? 'completed' : 'active';

            // Optimistic update in state
            setSubtasks(subtasks.map(st =>
                st.id === subtask.id
                    ? {
                        ...st,
                        status: newStatus,
                        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                    }
                    : st
            ));

            // Update completion state
            setSubtaskCompletion({
                ...subtaskCompletion,
                [subtask.id]: newStatus === 'completed'
            });

            // Animate checkbox
            if (checkboxAnim.current[subtask.id]) {
                Animated.timing(checkboxAnim.current[subtask.id], {
                    toValue: newStatus === 'completed' ? 1 : 0,
                    duration: 200,
                    useNativeDriver: false,
                }).start();
            }

            // Animate progress bar
            const newCompletionPercentage = calculateCompletion() +
                (newStatus === 'completed' ? (100 / subtasks.length) : -(100 / subtasks.length));

            Animated.timing(progressAnim, {
                toValue: newCompletionPercentage,
                duration: 300,
                useNativeDriver: false,
            }).start();

            // Update in database
            const {error} = await supabase
                .from('subtasks')
                .update({
                    status: newStatus,
                    completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                })
                .eq('id', subtask.id);

            if (error) throw error;
        } catch (error: any) {
            console.error('Error updating subtask status:', error.message);
            Alert.alert('Error', 'Failed to update subtask');
            // Revert optimistic update
            fetchTaskDetails();
        }
    };

    // Add a new subtask
    const addSubtask = async () => {
        if (!task || newSubtask.trim() === '') return;

        try {
            setUpdating(true);

            // Add to database
            const {data, error} = await supabase
                .from('subtasks')
                .insert({
                    task_id: task.id,
                    title: newSubtask.trim(),
                    status: 'active',
                })
                .select()
                .single();

            if (error) throw error;

            // Update state with the new data from the API
            if (data) {
                // Add new subtask to list
                setSubtasks(prevSubtasks => [...prevSubtasks, data]);

                // Update completion state
                setSubtaskCompletion(prev => ({
                    ...prev,
                    [data.id]: false
                }));

                // Create animation for new subtask
                checkboxAnim.current[data.id] = new Animated.Value(0);

                // Update progress percentage
                Animated.timing(progressAnim, {
                    toValue: calculateCompletion(),
                    duration: 300,
                    useNativeDriver: false,
                }).start();

                setNewSubtask('');
            }
        } catch (error) {
            console.error('Error adding subtask:', error.message);
            Alert.alert('Error', 'Failed to add subtask');
        } finally {
            setUpdating(false);
        }
    };

    // Delete a subtask
    const deleteSubtask = async (subtaskId: string) => {
        try {
            setUpdating(true);

            // Optimistic update
            const updatedSubtasks = subtasks.filter(st => st.id !== subtaskId);
            setSubtasks(updatedSubtasks);

            // Update progress bar
            Animated.timing(progressAnim, {
                toValue: calculateCompletion(),
                duration: 300,
                useNativeDriver: false,
            }).start();

            // Delete from database
            const {error} = await supabase
                .from('subtasks')
                .delete()
                .eq('id', subtaskId);

            if (error) throw error;
        } catch (error: any) {
            console.error('Error deleting subtask:', error.message);
            Alert.alert('Error', 'Failed to delete subtask');
            // Revert optimistic update
            fetchTaskDetails();
        } finally {
            setUpdating(false);
        }
    };

    // Save edited task
    const saveEditedTask = async () => {
        if (!task) return;

        try {
            setUpdating(true);

            // Prepare updates
            const updates = {
                title: editedTitle.trim(),
                description: editedDescription.trim() || null,
                priority: editedPriority,
                due_date: editedDueDate ? editedDueDate.toISOString() : null,
            };

            // Update in database
            const {error} = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', task.id);

            if (error) throw error;

            // Update local state
            setTask({
                ...task,
                ...updates
            });

            // Schedule notification if due date is set and task is active
            if (updates.due_date && task.status === 'active') {
                await scheduleTaskNotification({
                    ...task,
                    ...updates
                });
            } else if (!updates.due_date) {
                // Cancel notification if due date is removed
                await cancelTaskNotification(task.id);
            }

            setIsEditing(false);
        } catch (error: any) {
            console.error('Error updating task:', error.message);
            Alert.alert('Error', 'Failed to update task');
        } finally {
            setUpdating(false);
        }
    };

    // Delete the task
    const deleteTask = async () => {
        if (!task) return;

        Alert.alert(
            'Delete Task',
            'Are you sure you want to delete this task? This cannot be undone.',
            [
                {text: 'Cancel', style: 'cancel'},
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setUpdating(true);

                            // Delete from database
                            const {error} = await supabase
                                .from('tasks')
                                .delete()
                                .eq('id', task.id);

                            if (error) throw error;

                            // Cancel notifications
                            await cancelTaskNotification(task.id);

                            // Navigate back to task list
                            navigation.goBack();
                        } catch (error: any) {
                            console.error('Error deleting task:', error.message);
                            Alert.alert('Error', 'Failed to delete task');
                            setUpdating(false);
                        }
                    },
                },
            ]
        );
    };

    const renderBackButton = () => (
        <BackButton onPress={() => navigation.goBack()}/>
    );

    const renderActionButtons = () => (
        <View style={styles.actionsContainer}>
            {isEditing ? (
                <ActionButtons
                    onCancel={() => {
                        setEditedTitle(task?.title || '');
                        setEditedDescription(task?.description || '');
                        setEditedPriority(task?.priority || 'medium');
                        setEditedDueDate(task?.due_date ? new Date(task.due_date) : null);
                        setIsEditing(false);
                    }}
                    onSave={saveEditedTask}
                    loading={updating}
                    disabled={editedTitle.trim() === ''}
                />
            ) : (
                <>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => setIsEditing(true)}
                        disabled={updating}
                    >
                        <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={deleteTask}
                    >
                        {updating ? (
                            <ActivityIndicator size="small" color={COLORS.white}/>
                        ) : (
                            <Text style={styles.deleteButtonText}>Delete</Text>
                        )}
                    </TouchableOpacity>
                </>
            )}
        </View>
    );

    if (loading) {
        return (
            <ScreenLayout>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary}/>
                    <Text style={styles.loadingText}>Loading task details...</Text>
                </View>
            </ScreenLayout>
        );
    }

    if (!task) {
        return (
            <ScreenLayout>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Task not found</Text>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </ScreenLayout>
        );
    }

    const dueStatus = getDueStatus();
    const completionPercentage = calculateCompletion();
    const formattedDueDate = formatDueDate(task.due_date);
    const timeRemaining = formatRemainingTime();

    return (
        <ScreenLayout
            leftComponent={renderBackButton()}
            rightComponent={renderActionButtons()}
            title={isEditing ? "Edit Task" : "Task Details"}
        >
            <KeyboardAvoidingView
                style={{flex: 1}}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.contentContainer}
                >
                    <Animated.View style={[
                        styles.container,
                        {opacity: fadeAnim}
                    ]}>
                        {isEditing ? (
                            // Edit Mode
                            <View style={styles.editFormContainer}>
                                <Text style={styles.label}>Title:</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editedTitle}
                                    onChangeText={setEditedTitle}
                                    placeholder="Task title"
                                    autoCapitalize="sentences"
                                    maxLength={100}
                                />

                                <Text style={styles.label}>Description:</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={editedDescription}
                                    onChangeText={setEditedDescription}
                                    placeholder="Add details about this task..."
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />

                                <Text style={styles.label}>Priority:</Text>
                                <View style={styles.priorityPickerContainer}>
                                    <TouchableOpacity
                                        style={[
                                            styles.priorityOption,
                                            editedPriority === 'low' && styles.selectedPriorityOption,
                                            {backgroundColor: editedPriority === 'low' ? COLORS.lowPriority : COLORS.lightGray}
                                        ]}
                                        onPress={() => setEditedPriority('low')}
                                    >
                                        <Ionicons
                                            name="checkmark-circle"
                                            size={16}
                                            color={editedPriority === 'low' ? COLORS.white : COLORS.dark}
                                        />
                                        <Text style={[
                                            styles.priorityOptionText,
                                            editedPriority === 'low' && styles.selectedPriorityOptionText
                                        ]}>Low</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.priorityOption,
                                            editedPriority === 'medium' && styles.selectedPriorityOption,
                                            {backgroundColor: editedPriority === 'medium' ? COLORS.mediumPriority : COLORS.lightGray}
                                        ]}
                                        onPress={() => setEditedPriority('medium')}
                                    >
                                        <Ionicons
                                            name="alert"
                                            size={16}
                                            color={editedPriority === 'medium' ? COLORS.white : COLORS.dark}
                                        />
                                        <Text style={[
                                            styles.priorityOptionText,
                                            editedPriority === 'medium' && styles.selectedPriorityOptionText
                                        ]}>Medium</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.priorityOption,
                                            editedPriority === 'high' && styles.selectedPriorityOption,
                                            {backgroundColor: editedPriority === 'high' ? COLORS.highPriority : COLORS.lightGray}
                                        ]}
                                        onPress={() => setEditedPriority('high')}
                                    >
                                        <Ionicons
                                            name="alert-circle"
                                            size={16}
                                            color={editedPriority === 'high' ? COLORS.white : COLORS.dark}
                                        />
                                        <Text style={[
                                            styles.priorityOptionText,
                                            editedPriority === 'high' && styles.selectedPriorityOptionText
                                        ]}>High</Text>
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.label}>Due Date:</Text>
                                <View style={styles.dueDateContainer}>
                                    <TouchableOpacity
                                        style={styles.datePickerButton}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Ionicons name="calendar" size={18} color={COLORS.primary}
                                                  style={styles.datePickerIcon}/>
                                        <Text style={styles.datePickerButtonText}>
                                            {editedDueDate ? editedDueDate.toLocaleDateString() : 'Select a date'}
                                        </Text>
                                    </TouchableOpacity>

                                    {editedDueDate && (
                                        <View style={styles.dateTimeActions}>
                                            <TouchableOpacity
                                                style={styles.timePickerButton}
                                                onPress={() => setShowTimePicker(true)}
                                            >
                                                <Ionicons name="time" size={18} color={COLORS.primary}/>
                                                <Text style={styles.timePickerButtonText}>
                                                    {editedDueDate.toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.clearDateButton}
                                                onPress={() => setEditedDueDate(null)}
                                            >
                                                <Ionicons name="close-circle" size={18} color={COLORS.danger}/>
                                                <Text style={styles.clearDateButtonText}>Clear</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={editedDueDate || new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onDateChange}
                                        minimumDate={new Date()}
                                    />
                                )}

                                {showTimePicker && (
                                    <DateTimePicker
                                        value={editedDueDate || new Date()}
                                        mode="time"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={onTimeChange}
                                    />
                                )}
                            </View>
                        ) : (
                            // View Mode
                            <View style={styles.taskDetailsContainer}>
                                {/* Task Header with Status */}
                                <View style={styles.taskHeader}>
                                    <View style={styles.taskTitleSection}>
                                        <Text style={styles.taskTitle}>
                                            {task.title}
                                        </Text>

                                        <View style={[
                                            styles.statusBadge,
                                            task.status === 'completed' ? styles.completedBadge :
                                                dueStatus.isOverdue ? styles.overdueBadge :
                                                    dueStatus.isDueSoon ? styles.dueSoonBadge : styles.activeBadge
                                        ]}>
                                            <Ionicons
                                                name={
                                                    task.status === 'completed' ? 'checkmark-circle' :
                                                        dueStatus.isOverdue ? 'alert-circle' :
                                                            dueStatus.isDueSoon ? 'time' : 'checkbox-outline'
                                                }
                                                size={16}
                                                color={COLORS.white}
                                            />
                                            <Text style={styles.statusBadgeText}>
                                                {task.status === 'completed' ? 'Completed' :
                                                    dueStatus.isOverdue ? 'Overdue' :
                                                        dueStatus.isDueSoon ? 'Due Soon' : 'Active'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Priority Badge */}
                                    <View style={[
                                        styles.priorityBadge,
                                        task.priority === 'high' ? styles.highPriorityBadge :
                                            task.priority === 'medium' ? styles.mediumPriorityBadge : styles.lowPriorityBadge
                                    ]}>
                                        <Ionicons
                                            name={
                                                task.priority === 'high' ? 'alert-circle' :
                                                    task.priority === 'medium' ? 'alert' : 'checkmark-circle'
                                            }
                                            size={14}
                                            color={COLORS.white}
                                        />
                                        <Text style={styles.priorityBadgeText}>
                                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                                        </Text>
                                    </View>
                                </View>

                                {/* Progress Bar for Subtasks */}
                                {subtasks.length > 0 && (
                                    <View style={styles.progressSection}>
                                        <View style={styles.progressHeader}>
                                            <Text style={styles.progressTitle}>
                                                Progress: {completionPercentage}%
                                            </Text>
                                            <Text style={styles.progressSubtitle}>
                                                {subtasks.filter(s => s.status === 'completed').length} of {subtasks.length} subtasks
                                                completed
                                            </Text>
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
                                                    completionPercentage === 100 ? styles.completedProgressBar : null
                                                ]}
                                            />
                                        </View>
                                    </View>
                                )}

                                {/* Time Section */}
                                {task.due_date && (
                                    <View style={[
                                        styles.timeSection,
                                        dueStatus.isOverdue ? styles.overdueTimeSection :
                                            dueStatus.isDueSoon ? styles.dueSoonTimeSection : null
                                    ]}>
                                        <View style={styles.dueDateRow}>
                                            <Ionicons
                                                name="calendar"
                                                size={20}
                                                color={
                                                    dueStatus.isOverdue ? COLORS.danger :
                                                        dueStatus.isDueSoon ? COLORS.warning : COLORS.gray
                                                }
                                            />
                                            <Text style={[
                                                styles.dueDateText,
                                                dueStatus.isOverdue ? styles.overdueText :
                                                    dueStatus.isDueSoon ? styles.dueSoonText : null
                                            ]}>
                                                {formattedDueDate}
                                            </Text>
                                        </View>

                                        {timeRemaining && (
                                            <View style={styles.timeRemainingRow}>
                                                <Ionicons
                                                    name={task.status === 'completed' ? 'checkmark-done-circle' : dueStatus.isOverdue ? 'hourglass' : 'time'}
                                                    size={20}
                                                    color={
                                                        task.status === 'completed' ? COLORS.success :
                                                            dueStatus.isOverdue ? COLORS.danger :
                                                                dueStatus.isDueSoon ? COLORS.warning : COLORS.gray
                                                    }
                                                />
                                                <Text style={[
                                                    styles.timeRemainingText,
                                                    task.status === 'completed' ? styles.completedTimeText :
                                                        dueStatus.isOverdue ? styles.overdueText :
                                                            dueStatus.isDueSoon ? styles.dueSoonText : null
                                                ]}>
                                                    {timeRemaining}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* Task Completion Toggle */}
                                <View style={styles.completionToggle}>
                                    <Text style={styles.completionToggleLabel}>
                                        {task.status === 'completed'
                                            ? 'Mark as incomplete'
                                            : 'Mark task as complete'}
                                    </Text>
                                    <Switch
                                        value={task.status === 'completed'}
                                        onValueChange={toggleTaskCompletion}
                                        disabled={updating}
                                        trackColor={{
                                            false: COLORS.lightGray,
                                            true: COLORS.primaryLight
                                        }}
                                        thumbColor={task.status === 'completed' ? COLORS.success : '#f4f3f4'}
                                        ios_backgroundColor={COLORS.lightGray}
                                    />
                                </View>

                                {/* Description Section */}
                                {task.description && (
                                    <View style={styles.descriptionSection}>
                                        <Text style={styles.sectionTitle}>Description</Text>
                                        <View style={styles.descriptionContainer}>
                                            <Text style={styles.descriptionText}>
                                                {task.description}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Dates Section */}
                                <View style={styles.datesSection}>
                                    <View style={styles.dateItem}>
                                        <Text style={styles.dateLabel}>Created:</Text>
                                        <Text style={styles.dateValue}>
                                            {new Date(task.created_at).toLocaleString()}
                                        </Text>
                                    </View>

                                    {task.completed_at && (
                                        <View style={styles.dateItem}>
                                            <Text style={styles.dateLabel}>Completed:</Text>
                                            <Text style={styles.dateValue}>
                                                {new Date(task.completed_at).toLocaleString()}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Subtasks Section */}
                        <View style={styles.subtasksContainer}>
                            <Text style={styles.sectionTitle}>
                                Subtasks {subtasks.length > 0 ? `(${subtasks.length})` : ''}
                            </Text>

                            {subtasks.length === 0 ? (
                                <Text style={styles.noSubtasksText}>No subtasks yet</Text>
                            ) : (
                                subtasks.map(subtask => (
                                    <View key={subtask.id} style={styles.subtaskItem}>
                                        <TouchableOpacity
                                            style={styles.subtaskCheckboxContainer}
                                            onPress={() => toggleSubtaskCompletion(subtask)}
                                            disabled={updating}
                                        >
                                            <Animated.View
                                                style={[
                                                    styles.subtaskCheckbox,
                                                    {
                                                        backgroundColor: checkboxAnim.current[subtask.id]?.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [COLORS.white, COLORS.primary]
                                                        }),
                                                        borderColor: checkboxAnim.current[subtask.id]?.interpolate({
                                                            inputRange: [0, 1],
                                                            outputRange: [COLORS.gray, COLORS.primary]
                                                        })
                                                    }
                                                ]}
                                            >
                                                {subtask.status === 'completed' && (
                                                    <Ionicons name="checkmark" size={16} color={COLORS.white}/>
                                                )}
                                            </Animated.View>

                                            <Text
                                                style={[
                                                    styles.subtaskText,
                                                    subtask.status === 'completed' && styles.completedSubtaskText
                                                ]}
                                            >
                                                {subtask.title}
                                            </Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.deleteSubtaskButton}
                                            onPress={() => deleteSubtask(subtask.id)}
                                            disabled={updating}
                                        >
                                            <Ionicons name="trash-outline" size={18} color={COLORS.danger}/>
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}

                            {/* Add Subtask Input */}
                            <View style={styles.addSubtaskContainer}>
                                <TextInput
                                    style={styles.addSubtaskInput}
                                    value={newSubtask}
                                    onChangeText={setNewSubtask}
                                    placeholder="Add a new subtask..."
                                    returnKeyType="done"
                                    onSubmitEditing={addSubtask}
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.addSubtaskButton,
                                        newSubtask.trim() === '' && styles.disabledAddSubtaskButton
                                    ]}
                                    onPress={addSubtask}
                                    disabled={newSubtask.trim() === '' || updating}
                                >
                                    {updating ? (
                                        <ActivityIndicator size="small" color={COLORS.white}/>
                                    ) : (
                                        <Ionicons name="add" size={24} color={COLORS.white}/>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.light,
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: SPACING.md,
        paddingBottom: SPACING.xxl,
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
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    errorText: {
        ...Typography.h3,
        color: COLORS.danger,
        marginBottom: SPACING.md,
    },
    backButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: SPACING.xs,
    },
    backButtonText: {
        color: COLORS.white,
        fontWeight: FONTS.weight.semiBold,
    },
    actionsContainer: {
        flexDirection: 'row',
    },
    editButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.md,
        borderRadius: SPACING.xs,
        marginRight: SPACING.sm,
    },
    editButtonText: {
        color: COLORS.white,
        fontSize: FONTS.size.sm,
        fontWeight: FONTS.weight.semiBold,
    },
    deleteButton: {
        backgroundColor: COLORS.danger,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.md,
        borderRadius: SPACING.xs,
    },
    deleteButtonText: {
        color: COLORS.white,
        fontSize: FONTS.size.sm,
        fontWeight: FONTS.weight.semiBold,
    },

    // Task Details View Styles
    taskDetailsContainer: {
        backgroundColor: COLORS.white,
        borderRadius: SPACING.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...CommonStyles.card,
    },
    taskHeader: {
        marginBottom: SPACING.md,
    },
    taskTitleSection: {
        marginBottom: SPACING.sm,
    },
    taskTitle: {
        ...Typography.h2,
        fontSize: 22,
        marginBottom: SPACING.xs,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: 16,
        alignSelf: 'flex-start',
        marginBottom: SPACING.xs,
    },
    statusBadgeText: {
        color: COLORS.white,
        fontSize: FONTS.size.xs,
        fontWeight: FONTS.weight.semiBold,
        marginLeft: SPACING.xs,
    },
    completedBadge: {
        backgroundColor: COLORS.success,
    },
    overdueBadge: {
        backgroundColor: COLORS.danger,
    },
    dueSoonBadge: {
        backgroundColor: COLORS.warning,
    },
    activeBadge: {
        backgroundColor: COLORS.info,
    },
    priorityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    priorityBadgeText: {
        color: COLORS.white,
        fontSize: FONTS.size.xs,
        fontWeight: FONTS.weight.semiBold,
        marginLeft: SPACING.xs,
    },
    highPriorityBadge: {
        backgroundColor: COLORS.highPriority,
    },
    mediumPriorityBadge: {
        backgroundColor: COLORS.mediumPriority,
    },
    lowPriorityBadge: {
        backgroundColor: COLORS.lowPriority,
    },
    progressSection: {
        marginBottom: SPACING.md,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    progressTitle: {
        ...Typography.bodyMedium,
        fontWeight: FONTS.weight.semiBold,
    },
    progressSubtitle: {
        ...Typography.caption,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: COLORS.lightGray,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 4,
    },
    completedProgressBar: {
        backgroundColor: COLORS.success,
    },
    timeSection: {
        backgroundColor: COLORS.lightGray,
        borderRadius: SPACING.sm,
        padding: SPACING.sm,
        marginBottom: SPACING.md,
    },
    overdueTimeSection: {
        backgroundColor: '#ffebee', // Light red
    },
    dueSoonTimeSection: {
        backgroundColor: '#fff8e1', // Light yellow
    },
    dueDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    dueDateText: {
        ...Typography.bodyMedium,
        marginLeft: SPACING.sm,
    },
    timeRemainingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeRemainingText: {
        ...Typography.bodyMedium,
        marginLeft: SPACING.sm,
    },
    overdueText: {
        color: COLORS.danger,
        fontWeight: FONTS.weight.semiBold,
    },
    dueSoonText: {
        color: COLORS.warning,
        fontWeight: FONTS.weight.semiBold,
    },
    completedTimeText: {
        color: COLORS.success,
        fontWeight: FONTS.weight.semiBold,
    },
    completionToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: SPACING.sm,
        borderRadius: SPACING.sm,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    completionToggleLabel: {
        ...Typography.bodyMedium,
    },
    descriptionSection: {
        marginBottom: SPACING.md,
    },
    sectionTitle: {
        ...Typography.h3,
        fontSize: FONTS.size.lg,
        marginBottom: SPACING.sm,
    },
    descriptionContainer: {
        backgroundColor: COLORS.white,
        borderRadius: SPACING.sm,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    descriptionText: {
        ...Typography.bodyRegular,
        lineHeight: 22,
    },
    datesSection: {
        marginBottom: SPACING.md,
    },
    dateItem: {
        flexDirection: 'row',
        marginBottom: SPACING.xs,
    },
    dateLabel: {
        ...Typography.bodyMedium,
        fontWeight: FONTS.weight.semiBold,
        width: 80,
    },
    dateValue: {
        ...Typography.bodyRegular,
        flex: 1,
    },

    // Subtasks Section
    subtasksContainer: {
        backgroundColor: COLORS.white,
        borderRadius: SPACING.md,
        padding: SPACING.md,
        ...CommonStyles.card,
    },
    noSubtasksText: {
        ...Typography.bodyRegular,
        color: COLORS.gray,
        fontStyle: 'italic',
        marginBottom: SPACING.md,
    },
    subtaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    subtaskCheckboxContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    subtaskCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.gray,
        marginRight: SPACING.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    subtaskText: {
        ...Typography.bodyRegular,
        flex: 1,
    },
    completedSubtaskText: {
        textDecorationLine: 'line-through',
        color: COLORS.gray,
    },
    deleteSubtaskButton: {
        padding: SPACING.sm,
    },
    addSubtaskContainer: {
        flexDirection: 'row',
        marginTop: SPACING.md,
    },
    addSubtaskInput: {
        flex: 1,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.sm,
        marginRight: SPACING.sm,
        ...Typography.bodyRegular,
    },
    addSubtaskButton: {
        backgroundColor: COLORS.primary,
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledAddSubtaskButton: {
        backgroundColor: COLORS.gray,
        opacity: 0.5,
    },

    // Edit Mode Styles
    editFormContainer: {
        backgroundColor: COLORS.white,
        borderRadius: SPACING.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...CommonStyles.card,
    },
    label: {
        ...Typography.label,
        marginBottom: SPACING.xs,
    },
    input: {
        ...CommonStyles.input,
        marginBottom: SPACING.md,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    priorityPickerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    priorityOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.sm,
        borderRadius: SPACING.xs,
        marginHorizontal: SPACING.xxs,
    },
    selectedPriorityOption: {
        borderWidth: 0,
    },
    priorityOptionText: {
        ...Typography.bodyMedium,
        marginLeft: SPACING.xs,
    },
    selectedPriorityOptionText: {
        color: COLORS.white,
        fontWeight: FONTS.weight.semiBold,
    },
    dueDateContainer: {
        marginBottom: SPACING.md,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: SPACING.xs,
        padding: SPACING.sm,
        marginBottom: SPACING.sm,
    },
    datePickerIcon: {
        marginRight: SPACING.sm,
    },
    datePickerButtonText: {
        ...Typography.bodyRegular,
    },
    dateTimeActions: {
        flexDirection: 'row',
    },
    timePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: SPACING.xs,
        padding: SPACING.sm,
        flex: 1,
        marginRight: SPACING.sm,
    },
    timePickerButtonText: {
        ...Typography.bodyRegular,
        marginLeft: SPACING.xs,
    },
    clearDateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.lightGray,
        borderRadius: SPACING.xs,
        padding: SPACING.sm,
    },
    clearDateButtonText: {
        ...Typography.bodyRegular,
        color: COLORS.danger,
        marginLeft: SPACING.xs,
    },
});

export default TaskDetailScreen;