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
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { Task, Subtask } from '../../utils/supabase';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

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
    const [isDatePickerVisible, setDatePickerVisible] = useState(false);
    const [editedDueDate, setEditedDueDate] = useState<string | null>(task?.due_date || null);
    const showDatePicker = () => {
        setDatePickerVisible(true);
    };

    const hideDatePicker = () => {
        setDatePickerVisible(false);
    };

    const handleConfirmDate = (date: Date) => {
        setEditedDueDate(date.toISOString());
        hideDatePicker();
    };

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
        } catch (error: any) {
            console.error('Error fetching task details:', error.message);
            Alert.alert('Error', 'Failed to load task details');
            navigation.goBack();
        } finally {
            setLoading(false);
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

            // Update in database
            const { error } = await supabase
                .from('tasks')
                .update({
                    title: editedTitle.trim(),
                    description: editedDescription.trim() || null,
                    priority: editedPriority,
                })
                .eq('id', task.id);

            if (error) throw error;

            // Update local state
            setTask({
                ...task,
                title: editedTitle.trim(),
                description: editedDescription.trim() || null,
                priority: editedPriority,
            });

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
                            disabled={updating}
                        >
                            <Text style={styles.deleteButtonText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView style={styles.content}>
                {isEditing ? (
                    <View style={styles.editContainer}>
                        <Text style={styles.editLabel}>Title</Text>
                        <TextInput
                            style={styles.editTitleInput}
                            value={editedTitle}
                            onChangeText={setEditedTitle}
                            placeholder="Task title"
                            maxLength={100}
                        />

                        <Text style={styles.editLabel}>Description</Text>
                        <TextInput
                            style={styles.editDescriptionInput}
                            value={editedDescription}
                            onChangeText={setEditedDescription}
                            placeholder="Task description (optional)"
                            multiline
                            numberOfLines={4}
                        />

                        <Text style={styles.editLabel}>Priority</Text>
                        <View style={styles.priorityButtons}>
                            <TouchableOpacity
                                style={[
                                    styles.priorityButton,
                                    styles.lowPriorityButton,
                                    editedPriority === 'low' && styles.selectedPriorityButton,
                                ]}
                                onPress={() => setEditedPriority('low')}
                            >
                                <Text style={styles.priorityButtonText}>Low</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.priorityButton,
                                    styles.mediumPriorityButton,
                                    editedPriority === 'medium' && styles.selectedPriorityButton,
                                ]}
                                onPress={() => setEditedPriority('medium')}
                            >
                                <Text style={styles.priorityButtonText}>Medium</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.priorityButton,
                                    styles.highPriorityButton,
                                    editedPriority === 'high' && styles.selectedPriorityButton,
                                ]}
                                onPress={() => setEditedPriority('high')}
                            >
                                <Text style={styles.priorityButtonText}>High</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.taskDetails}>
                        <View style={styles.taskHeaderRow}>
                            <TouchableOpacity
                                style={[
                                    styles.taskCheckbox,
                                    task.status === 'completed' && styles.taskCheckboxChecked,
                                ]}
                                onPress={toggleTaskCompletion}
                                disabled={updating}
                            >
                                {task.status === 'completed' && (
                                    <View style={styles.checkboxInner} />
                                )}
                            </TouchableOpacity>

                            <View
                                style={[
                                    styles.taskPriorityIndicator,
                                    styles[`priority${task.priority}`],
                                ]}
                            />

                            <Text
                                style={[
                                    styles.taskTitle,
                                    task.status === 'completed' && styles.completedText,
                                ]}
                            >
                                {task.title}
                            </Text>
                        </View>

                        {task.description ? (
                            <Text
                                style={[
                                    styles.taskDescription,
                                    task.status === 'completed' && styles.completedText,
                                ]}
                            >
                                {task.description}
                            </Text>
                        ) : null}

                        {task.due_date ? (
                            <Text style={styles.taskDueDate}>
                                Due: {new Date(task.due_date).toLocaleDateString()}
                            </Text>
                        ) : null}

                        <View style={styles.taskStatusRow}>
                            <Text style={styles.taskStatusLabel}>Status:</Text>
                            <Text
                                style={[
                                    styles.taskStatusValue,
                                    task.status === 'completed'
                                        ? styles.taskCompletedStatus
                                        : styles.taskActiveStatus,
                                ]}
                            >
                                {task.status === 'completed' ? 'Completed' : 'Active'}
                            </Text>
                        </View>

                        {task.status === 'completed' && task.completed_at ? (
                            <Text style={styles.taskCompletedDate}>
                                Completed on: {new Date(task.completed_at).toLocaleDateString()}
                            </Text>
                        ) : null}
                    </View>
                )}

                <View style={styles.subtasksSection}>
                    <Text style={styles.subtasksHeader}>Subtasks</Text>

                    {subtasks.length === 0 ? (
                        <Text style={styles.noSubtasksText}>No subtasks yet</Text>
                    ) : (
                        subtasks.map((subtask) => (
                            <View key={subtask.id} style={styles.subtaskItem}>
                                <TouchableOpacity
                                    style={[
                                        styles.subtaskCheckbox,
                                        subtask.status === 'completed' && styles.subtaskCheckboxChecked,
                                    ]}
                                    onPress={() => toggleSubtaskCompletion(subtask)}
                                >
                                    {subtask.status === 'completed' && (
                                        <View style={styles.checkboxInner} />
                                    )}
                                </TouchableOpacity>

                                <Text
                                    style={[
                                        styles.subtaskTitle,
                                        subtask.status === 'completed' && styles.completedText,
                                    ]}
                                >
                                    {subtask.title}
                                </Text>

                                <TouchableOpacity
                                    style={styles.subtaskDeleteButton}
                                    onPress={() => deleteSubtask(subtask.id)}
                                >
                                    <Text style={styles.subtaskDeleteButtonText}>×</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}

                    <View style={styles.addSubtaskContainer}>
                        <TextInput
                            style={styles.addSubtaskInput}
                            value={newSubtask}
                            onChangeText={setNewSubtask}
                            placeholder="Add a subtask"
                            returnKeyType="done"
                            onSubmitEditing={addSubtask}
                        />
                        <TouchableOpacity
                            style={styles.addSubtaskButton}
                            onPress={addSubtask}
                            disabled={updating || newSubtask.trim() === ''}
                        >
                            {updating ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.addSubtaskButtonText}>+</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9FC',
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
        marginBottom: 20,
        color: '#e74c3c',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    backButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    backButtonText: {
        fontSize: 16,
        color: '#3498db',
    },
    actionsContainer: {
        flexDirection: 'row',
    },
    editButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#3498db',
        borderRadius: 4,
        marginRight: 8,
    },
    editButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    deleteButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#e74c3c',
        borderRadius: 4,
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    editButtonsContainer: {
        flexDirection: 'row',
    },
    cancelButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#ECF0F1',
        borderRadius: 4,
        marginRight: 8,
    },
    cancelButtonText: {
        color: '#7F8C8D',
        fontWeight: '600',
    },
    saveButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#2ecc71',
        borderRadius: 4,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    taskDetails: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    editContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    editLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    editTitleInput: {
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#DDE3ED',
        borderRadius: 6,
        padding: 10,
        fontSize: 16,
        marginBottom: 16,
    },
    editDescriptionInput: {
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#DDE3ED',
        borderRadius: 6,
        padding: 10,
        fontSize: 16,
        marginBottom: 16,
        textAlignVertical: 'top',
        minHeight: 100,
    },
    priorityButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    priorityButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DDE3ED',
        marginHorizontal: 4,
        borderRadius: 6,
    },
    lowPriorityButton: {
        backgroundColor: '#E8F8F5',
    },
    mediumPriorityButton: {
        backgroundColor: '#FEF9E7',
    },
    highPriorityButton: {
        backgroundColor: '#FDEDEC',
    },
    selectedPriorityButton: {
        borderWidth: 2,
        borderColor: '#3498db',
    },
    priorityButtonText: {
        fontWeight: '600',
    },
    taskHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    taskCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#3498db',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    taskCheckboxChecked: {
        backgroundColor: '#F0F8FF',
    },
    checkboxInner: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#3498db',
    },
    taskPriorityIndicator: {
        width: 4,
        height: 24,
        borderRadius: 2,
        marginRight: 12,
    },
    prioritylow: {
        backgroundColor: '#2ecc71',
    },
    prioritymedium: {
        backgroundColor: '#f39c12',
    },
    priorityhigh: {
        backgroundColor: '#e74c3c',
    },
    taskTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    completedText: {
        textDecorationLine: 'line-through',
        color: '#95A5A6',
    },
    taskDescription: {
        fontSize: 16,
        color: '#666',
        marginBottom: 16,
        lineHeight: 22,
    },
    taskDueDate: {
        fontSize: 14,
        color: '#3498db',
        marginBottom: 16,
    },
    taskStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    taskStatusLabel: {
        fontSize: 14,
        color: '#7F8C8D',
        marginRight: 8,
    },
    taskStatusValue: {
        fontSize: 14,
        fontWeight: '600',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    taskCompletedStatus: {
        backgroundColor: '#D5F5E3',
        color: '#27AE60',
    },
    taskActiveStatus: {
        backgroundColor: '#E8F4FC',
        color: '#3498db',
    },
    taskCompletedDate: {
        fontSize: 14,
        color: '#7F8C8D',
        marginTop: 8,
    },
    subtasksSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    subtasksHeader: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: '#333',
    },
    noSubtasksText: {
        fontSize: 16,
        color: '#95A5A6',
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 16,
    },
    subtaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    subtaskCheckbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#3498db',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    subtaskCheckboxChecked: {
        backgroundColor: '#F0F8FF',
    },
    subtaskTitle: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    subtaskDeleteButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    subtaskDeleteButtonText: {
        fontSize: 18,
        color: '#E74C3C',
        fontWeight: 'bold',
    },
    addSubtaskContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
    },
    addSubtaskInput: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        borderWidth: 1,
        borderColor: '#DDE3ED',
        borderRadius: 6,
        padding: 10,
        fontSize: 16,
        marginRight: 8,
    },
    addSubtaskButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#3498db',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addSubtaskButtonText: {
        fontSize: 24,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
});

export default TaskDetailScreen;