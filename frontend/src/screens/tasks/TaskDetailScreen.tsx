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
import BackButton from "../../components/BackButton";
import ActionButtons from "../../components/ActionButtons";

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

            // Update state with the new data from the API
            if (data) {
                setSubtasks(prevSubtasks => [...prevSubtasks, data]);
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
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <BackButton onPress={() => navigation.goBack()} />

                    {isEditing ? (
                        <ActionButtons
                            onCancel={() => {
                                setEditedTitle(task.title);
                                setEditedDescription(task.description || '');
                                setEditedPriority(task.priority);
                                setEditedDueDate(task.due_date ? new Date(task.due_date) : null);
                                setIsEditing(false);
                            }}
                            onSave={saveEditedTask}
                            loading={updating}
                            disabled={editedTitle.trim() === ''}
                        />
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
                                </View>

                                <View style={styles.completionContainer}>
                                    <Text style={styles.completionLabel}>
                                        {task.status === 'completed' ? 'Completed' : 'Mark Complete'}
                                    </Text>
                                    <Switch
                                        value={task.status === 'completed'}
                                        onValueChange={toggleTaskCompletion}
                                        disabled={updating}
                                        trackColor={{ false: '#bdc3c7', true: '#2ecc71' }}
                                        thumbColor={task.status === 'completed' ? '#27ae60' : '#ecf0f1'}
                                    />
                                </View>
                            </View>

                            {task.due_date && (
                                <View style={styles.dueDateDisplay}>
                                    <Text style={styles.dueDateLabel}>Due Date:</Text>
                                    <Text style={styles.dueDateText}>
                                        {new Date(task.due_date).toLocaleDateString()}
                                    </Text>
                                </View>
                            )}

                            {task.description && (
                                <View style={styles.descriptionContainer}>
                                    <Text style={styles.descriptionTitle}>Description:</Text>
                                    <Text style={styles.descriptionText}>{task.description}</Text>
                                </View>
                            )}

                            <View style={styles.subtasksContainer}>
                                <Text style={styles.subtasksTitle}>Subtasks:</Text>

                                {subtasks.length === 0 ? (
                                    <Text style={styles.noSubtasksText}>No subtasks yet</Text>
                                ) : (
                                    subtasks.map(subtask => (
                                        <View key={subtask.id} style={styles.subtaskItem}>
                                            <View style={styles.subtaskContent}>
                                                <TouchableOpacity
                                                    style={[
                                                        styles.checkbox,
                                                        subtask.status === 'completed' && styles.checkedCheckbox
                                                    ]}
                                                    onPress={() => toggleSubtaskCompletion(subtask)}
                                                >
                                                    {subtask.status === 'completed' && (
                                                        <Text style={styles.checkmark}>✓</Text>
                                                    )}
                                                </TouchableOpacity>
                                                <Text style={[
                                                    styles.subtaskText,
                                                    subtask.status === 'completed' && styles.completedSubtaskText
                                                ]}>
                                                    {subtask.title}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                style={styles.deleteSubtaskButton}
                                                onPress={() => deleteSubtask(subtask.id)}
                                            >
                                                <Text style={styles.deleteSubtaskButtonText}>×</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))
                                )}

                                <View style={styles.addSubtaskContainer}>
                                    <TextInput
                                        style={styles.addSubtaskInput}
                                        value={newSubtask}
                                        onChangeText={setNewSubtask}
                                        placeholder="Add a new subtask"
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
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.addSubtaskButtonText}>Add</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    safeArea: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: '#e74c3c',
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    backButtonText: {
        fontSize: 16,
        color: '#3498db',
    },
    actionsContainer: {
        flexDirection: 'row',
    },
    editButton: {
        backgroundColor: '#3498db',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
        marginRight: 8,
    },
    editButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: '#e74c3c',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    deleteButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    editButtonsContainer: {
        flexDirection: 'row',
    },
    cancelButton: {
        backgroundColor: '#95a5a6',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
        marginRight: 8,
    },
    cancelButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    saveButton: {
        backgroundColor: '#2ecc71',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    saveButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    taskDetailsContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    taskHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    taskTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    taskTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#2c3e50',
        flex: 1,
    },
    completedTaskTitle: {
        textDecorationLine: 'line-through',
        color: '#95a5a6',
    },
    priorityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        marginLeft: 8,
    },
    lowPriorityBadge: {
        backgroundColor: '#e8f5e9',
    },
    mediumPriorityBadge: {
        backgroundColor: '#fff8e1',
    },
    highPriorityBadge: {
        backgroundColor: '#ffebee',
    },
    priorityBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    completionContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    completionLabel: {
        fontSize: 14,
        marginRight: 8,
        color: '#7f8c8d',
    },
    dueDateDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
    },
    dueDateLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7f8c8d',
        marginRight: 8,
    },
    dueDateText: {
        fontSize: 14,
        color: '#34495e',
    },
    descriptionContainer: {
        marginBottom: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
    },
    descriptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
    },
    descriptionText: {
        fontSize: 14,
        color: '#34495e',
        lineHeight: 20,
    },
    subtasksContainer: {
        marginBottom: 16,
    },
    subtasksTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 12,
    },
    noSubtasksText: {
        fontSize: 14,
        color: '#7f8c8d',
        fontStyle: 'italic',
        marginBottom: 16,
    },
    subtaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#ecf0f1',
    },
    subtaskContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#bdc3c7',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkedCheckbox: {
        backgroundColor: '#3498db',
        borderColor: '#3498db',
    },
    checkmark: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    subtaskText: {
        fontSize: 14,
        color: '#34495e',
        flex: 1,
    },
    completedSubtaskText: {
        textDecorationLine: 'line-through',
        color: '#95a5a6',
    },
    deleteSubtaskButton: {
        padding: 8,
    },
    deleteSubtaskButtonText: {
        fontSize: 18,
        color: '#e74c3c',
        fontWeight: 'bold',
    },
    addSubtaskContainer: {
        flexDirection: 'row',
        marginTop: 12,
    },
    addSubtaskInput: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 4,
        paddingHorizontal: 12,
        marginRight: 8,
        backgroundColor: '#ffffff',
    },
    addSubtaskButton: {
        backgroundColor: '#3498db',
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
    },
    disabledAddSubtaskButton: {
        backgroundColor: '#95a5a6',
    },
    addSubtaskButtonText: {
        color: '#ffffff',
        fontWeight: '600',
    },
    editFormContainer: {
        backgroundColor: '#ffffff',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 16,
        backgroundColor: '#ffffff',
        fontSize: 14,
    },
    textArea: {
        height: 100,
    },
    priorityPickerContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    priorityOption: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 4,
        marginRight: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedPriorityOption: {
        borderWidth: 0,
    },
    priorityOptionText: {
        fontSize: 14,
        color: '#34495e',
        fontWeight: '500',
    },
    selectedPriorityOptionText: {
        color: '#ffffff',
    },
    dueDateContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    datePickerButton: {
        flex: 1,
        height: 40,
        borderWidth: 1,
        borderColor: '#bdc3c7',
        borderRadius: 4,
        paddingHorizontal: 12,
        justifyContent: 'center',
        backgroundColor: '#ffffff',
        marginRight: 8,
    },
    datePickerButtonText: {
        color: '#34495e',
        fontSize: 14,
    },
    clearDateButton: {
        backgroundColor: '#95a5a6',
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
    },
    clearDateButtonText: {
        color: '#ffffff',
        fontWeight: '600',
    },
});

export default TaskDetailScreen;