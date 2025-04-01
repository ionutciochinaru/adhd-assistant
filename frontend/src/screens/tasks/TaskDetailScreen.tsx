// frontend/src/screens/tasks/TaskDetailScreen.tsx
import React, { useState, useEffect } from 'react';
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
    SafeAreaView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { Task, Subtask } from '../../utils/supabase';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTaskNotifications } from '../../hooks/useTaskNotifications';

// Navigation types
type TasksStackParamList = {
    TasksList: undefined;
    CreateTask: undefined;
    TaskDetail: { taskId: string };
};

type Props = StackScreenProps<TasksStackParamList, 'TaskDetail'>;

const TaskDetailScreen = ({ route, navigation }: Props) => {
    const { taskId } = route.params;
    const { user } = useAuth();
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
    const [editedDueDate, setEditedDueDate] = useState<Date | null>(null);
    const { scheduleTaskNotification, cancelTaskNotification } = useTaskNotifications();

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

    // Fetch task details and subtasks from Supabase
    const fetchTaskDetails = async () => {
        try {
            setLoading(true);

            // Fetch the task
            const { data: taskData, error: taskError } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', taskId)
                .eq('user_id', user?.id)
                .single();

            if (taskError) throw taskError;

            // Fetch the subtasks
            const { data: subtasksData, error: subtasksError } = await supabase
                .from('subtasks')
                .select('*')
                .eq('task_id', taskId)
                .order('created_at', { ascending: true });

            if (subtasksError) throw subtasksError;

            setTask(taskData);
            setSubtasks(subtasksData || []);
            setEditedTitle(taskData.title);
            setEditedDescription(taskData.description || '');
            setEditedPriority(taskData.priority);
            setEditedDueDate(taskData.due_date ? new Date(taskData.due_date) : null);
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
            setEditedDueDate(selectedDate);
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
            const { error } = await supabase
                .from('tasks')
                .update({
                    status: newStatus,
                    completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                })
                .eq('id', task.id);

            if (error) throw error;
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

            // Optimistic update
            setSubtasks(subtasks.map(st =>
                st.id === subtask.id
                    ? {
                        ...st,
                        status: newStatus,
                        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
                    }
                    : st
            ));

            // Update in database
            const { error } = await supabase
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
            const { data, error } = await supabase
                .from('subtasks')
                .insert({
                    task_id: task.id,
                    title: newSubtask.trim(),
                    status: 'active',
                })
                .select()
                .single();

            if (error) throw error;

            // Update state
            setSubtasks([...subtasks, data]);
            setNewSubtask('');
        } catch (error: any) {
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
            setSubtasks(subtasks.filter(st => st.id !== subtaskId));

            // Delete from database
            const { error } = await supabase
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
            const { error } = await supabase
                .from('tasks')
                .update(updates)
                .eq('id', task.id);

            if (error) throw error;

            // Update local state
            setTask({
                ...task,
                ...updates
            });

            // Handle notification updates if due date changed
            if (task.due_date !== (editedDueDate ? editedDueDate.toISOString() : null)) {
                await scheduleTaskNotification({
                    ...task,
                    ...updates
                });
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
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setUpdating(true);

                            // Delete from database
                            const { error } = await supabase
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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498db" />
            </View>
        );
    }

    if (!task) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Task not found</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                        disabled={updating}
                    >
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>

                    {isEditing ? (
                        <View style={styles.editButtonsContainer}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    setEditedTitle(task.title);
                                    setEditedDescription(task.description || '');
                                    setEditedPriority(task.priority);
                                    setEditedDueDate(task.due_date ? new Date(task.due_date) : null);
                                    setIsEditing(false);
                                }}
                                disabled={updating}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={saveEditedTask}
                                disabled={updating || editedTitle.trim() === ''}
                            >
                                {updating ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.saveButtonText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.actionsContainer}>
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
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={styles.deleteButtonText}>Delete</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
                    {isEditing ? (
                        <View style={styles.editFormContainer}>
                            <Text style={styles.label}>Title:</Text>
                            <TextInput
                                style={styles.input}
                                value={editedTitle}
                                onChangeText={setEditedTitle}
                                placeholder="Task title"
                                autoCapitalize="sentences"
                            />

                            <Text style={styles.label}>Description:</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={editedDescription}
                                onChangeText={setEditedDescription}
                                placeholder="Task description (optional)"
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
                                        { backgroundColor: editedPriority === 'low' ? '#27ae60' : '#ecf0f1' }
                                    ]}
                                    onPress={() => setEditedPriority('low')}
                                >
                                    <Text style={[
                                        styles.priorityOptionText,
                                        editedPriority === 'low' && styles.selectedPriorityOptionText
                                    ]}>Low</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.priorityOption,
                                        editedPriority === 'medium' && styles.selectedPriorityOption,
                                        { backgroundColor: editedPriority === 'medium' ? '#f39c12' : '#ecf0f1' }
                                    ]}
                                    onPress={() => setEditedPriority('medium')}
                                >
                                    <Text style={[
                                        styles.priorityOptionText,
                                        editedPriority === 'medium' && styles.selectedPriorityOptionText
                                    ]}>Medium</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.priorityOption,
                                        editedPriority === 'high' && styles.selectedPriorityOption,
                                        { backgroundColor: editedPriority === 'high' ? '#e74c3c' : '#ecf0f1' }
                                    ]}
                                    onPress={() => setEditedPriority('high')}
                                >
                                    <Text style={[
                                        styles.priorityOptionText,
                                        editedPriority === 'high' && styles.selectedPriorityOptionText
                                    ]}>High</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Due Date (Optional):</Text>
                            <View style={styles.dueDateContainer}>
                                <TouchableOpacity
                                    style={styles.datePickerButton}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={styles.datePickerButtonText}>
                                        {editedDueDate ? editedDueDate.toLocaleDateString() : 'Select a date'}
                                    </Text>
                                </TouchableOpacity>
                                {editedDueDate && (
                                    <TouchableOpacity
                                        style={styles.clearDateButton}
                                        onPress={() => setEditedDueDate(null)}
                                    >
                                        <Text style={styles.clearDateButtonText}>Clear</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={editedDueDate || new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                    minimumDate={new Date()}
                                />
                            )}
                        </View>
                    ) : (
                        <View style={styles.taskDetailsContainer}>
                            <View style={styles.taskHeaderContainer}>
                                <View style={styles.taskTitleContainer}>
                                    <Text style={[
                                        styles.taskTitle,
                                        task.status === 'completed' && styles.completedTaskTitle
                                    ]}>
                                        {task.title}
                                    </Text>
                                    <View style={[
                                        styles.priorityBadge,
                                        task.priority === 'low' && styles.lowPriorityBadge,
                                        task.priority === 'medium' && styles.mediumPriorityBadge,
                                        task.priority === 'high' && styles.highPriorityBadge,
                                    ]}>
                                        <Text style={styles.priorityBadgeText}>
                                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                        </Text>
                                    </View>
                                </View