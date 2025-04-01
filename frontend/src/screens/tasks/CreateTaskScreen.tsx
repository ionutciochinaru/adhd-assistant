// frontend/src/screens/tasks/CreateTaskScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    ActivityIndicator,
    Alert,
    Platform,
    KeyboardAvoidingView,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTaskNotifications } from '../../hooks/useTaskNotifications';

// Navigation types
type TasksStackParamList = {
    TasksList: undefined;
    CreateTask: undefined;
    TaskDetail: { taskId: string };
};

type Props = StackScreenProps<TasksStackParamList, 'CreateTask'>;

const CreateTaskScreen = ({ navigation }: Props) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
    const [hasDueDate, setHasDueDate] = useState(false);
    const [dueDate, setDueDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [subtasks, setSubtasks] = useState<string[]>([]);
    const [newSubtask, setNewSubtask] = useState('');
    const [loading, setLoading] = useState(false);
    const [useAI, setUseAI] = useState(false);
    const { scheduleTaskNotification } = useTaskNotifications();

    // Handle date change
    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios'); // Keep open on iOS, close on Android
        if (selectedDate) {
            setDueDate(selectedDate);
        }
    };

    // Add a new subtask
    const addSubtask = () => {
        if (newSubtask.trim() === '') return;
        setSubtasks([...subtasks, newSubtask.trim()]);
        setNewSubtask('');
    };

    // Remove a subtask
    const removeSubtask = (index: number) => {
        setSubtasks(subtasks.filter((_, i) => i !== index));
    };

    // Request AI breakdown of task
    const requestAIBreakdown = async () => {
        if (title.trim() === '') {
            Alert.alert('Error', 'Please enter a task title first');
            return;
        }

        setLoading(true);
        try {
            // Simulate AI breakdown with a timeout
            // In a real app, this would call your backend API that uses an AI service
            setTimeout(() => {
                const aiGeneratedSubtasks = [
                    `Start working on ${title}`,
                    `Prepare materials for ${title}`,
                    `Review progress on ${title}`,
                    `Finalize ${title}`,
                ];
                setSubtasks(aiGeneratedSubtasks);
                setLoading(false);
            }, 1500);
        } catch (error) {
            console.error('Error in AI breakdown:', error);
            Alert.alert('Error', 'Failed to generate task breakdown');
            setLoading(false);
        }
    };

    // Create the task
    const createTask = async () => {
        if (title.trim() === '') {
            Alert.alert('Error', 'Please enter a task title');
            return;
        }

        setLoading(true);
        try {
            console.log('Creating new task:', title);

            // Create the task in the database
            const { data: task, error: taskError } = await supabase
                .from('tasks')
                .insert({
                    user_id: user?.id,
                    title: title.trim(),
                    description: description.trim() || null,
                    priority,
                    status: 'active',
                    due_date: hasDueDate ? dueDate.toISOString() : null,
                })
                .select()
                .single();

            if (taskError) {
                console.error('Error creating task:', taskError);
                throw taskError;
            }

            console.log('Task created successfully, ID:', task.id);

            // If we have subtasks, create them as well
            if (subtasks.length > 0 && task?.id) {
                console.log('Adding', subtasks.length, 'subtasks');
                const subtasksToInsert = subtasks.map(title => ({
                    task_id: task.id,
                    title,
                    status: 'active',
                }));

                const { error: subtasksError } = await supabase
                    .from('subtasks')
                    .insert(subtasksToInsert);

                if (subtasksError) {
                    console.error('Error adding subtasks:', subtasksError);
                    throw subtasksError;
                }

                console.log('Subtasks added successfully');
            }

            // Return to the task list
            if (task?.id && hasDueDate) {
                console.log('Scheduling notification for new task:', task.id);
                await scheduleTaskNotification(task);
            }

            navigation.goBack();
        } catch (error: any) {
            console.error('Error creating task:', error.message);
            Alert.alert('Error', 'Failed to create task: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => navigation.goBack()}
                        disabled={loading}
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>New Task</Text>
                    <TouchableOpacity
                        style={styles.createButton}
                        onPress={createTask}
                        disabled={loading || title.trim() === ''}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.createButtonText}>Create</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.formContainer}>
                    <Text style={styles.label}>Title</Text>
                    <TextInput
                        style={styles.titleInput}
                        placeholder="Enter task title"
                        value={title}
                        onChangeText={setTitle}
                        maxLength={100}
                    />

                    <Text style={styles.label}>Description (optional)</Text>
                    <TextInput
                        style={styles.descriptionInput}
                        placeholder="Enter task description"
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                    />

                    <Text style={styles.label}>Priority</Text>
                    <View style={styles.priorityButtons}>
                        <TouchableOpacity
                            style={[
                                styles.priorityButton,
                                styles.lowPriorityButton,
                                priority === 'low' && styles.selectedPriorityButton,
                            ]}
                            onPress={() => setPriority('low')}
                        >
                            <Text style={styles.priorityButtonText}>Low</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.priorityButton,
                                styles.mediumPriorityButton,
                                priority === 'medium' && styles.selectedPriorityButton,
                            ]}
                            onPress={() => setPriority('medium')}
                        >
                            <Text style={styles.priorityButtonText}>Medium</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.priorityButton,
                                styles.highPriorityButton,
                                priority === 'high' && styles.selectedPriorityButton,
                            ]}
                            onPress={() => setPriority('high')}
                        >
                            <Text style={styles.priorityButtonText}>High</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.dueDateContainer}>
                        <Text style={styles.label}>Due Date</Text>
                        <Switch
                            value={hasDueDate}
                            onValueChange={setHasDueDate}
                            trackColor={{ false: '#D1D1D6', true: '#BFE9FF' }}
                            thumbColor={hasDueDate ? '#3498db' : '#F4F4F4'}
                        />
                    </View>

                    {hasDueDate && (
                        <View style={styles.datePickerContainer}>
                            <TouchableOpacity
                                style={styles.dateButton}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={styles.dateButtonText}>
                                    {dueDate.toLocaleDateString()}
                                </Text>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={dueDate}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={onDateChange}
                                    minimumDate={new Date()}
                                />
                            )}
                        </View>
                    )}

                    <View style={styles.aiBreakdownContainer}>
                        <Text style={styles.label}>AI Task Breakdown</Text>
                        <Switch
                            value={useAI}
                            onValueChange={setUseAI}
                            trackColor={{ false: '#D1D1D6', true: '#BFE9FF' }}
                            thumbColor={useAI ? '#3498db' : '#F4F4F4'}
                        />
                    </View>

                    {useAI && (
                        <TouchableOpacity
                            style={styles.aiBreakdownButton}
                            onPress={requestAIBreakdown}
                            disabled={loading || title.trim() === ''}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.aiBreakdownButtonText}>
                                    Generate Subtasks
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}

                    <Text style={styles.label}>Subtasks</Text>
                    <View style={styles.subtasksContainer}>
                        {subtasks.map((subtask, index) => (
                            <View key={index} style={styles.subtaskItem}>
                                <Text style={styles.subtaskText} numberOfLines={1}>
                                    {subtask}
                                </Text>
                                <TouchableOpacity
                                    style={styles.subtaskRemoveButton}
                                    onPress={() => removeSubtask(index)}
                                >
                                    <Text style={styles.subtaskRemoveButtonText}>×</Text>
                                </TouchableOpacity>
                            </View>
                        ))}

                        <View style={styles.addSubtaskContainer}>
                            <TextInput
                                style={styles.subtaskInput}
                                placeholder="Add a subtask"
                                value={newSubtask}
                                onChangeText={setNewSubtask}
                                returnKeyType="done"
                                onSubmitEditing={addSubtask}
                            />
                            <TouchableOpacity
                                style={styles.addSubtaskButton}
                                onPress={addSubtask}
                                disabled={newSubtask.trim() === ''}
                            >
                                <Text style={styles.addSubtaskButtonText}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9FC',
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    cancelButton: {
        paddingHorizontal: 8,
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#666',
    },
    createButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#3498db',
        borderRadius: 6,
    },
    createButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    formContainer: {
        padding: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 16,
        color: '#333',
    },
    titleInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DDE3ED',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    descriptionInput: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DDE3ED',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        textAlignVertical: 'top',
        minHeight: 100,
    },
    priorityButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
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
    dueDateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    datePickerContainer: {
        marginTop: 8,
    },
    dateButton: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DDE3ED',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    dateButtonText: {
        fontSize: 16,
    },
    aiBreakdownContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    aiBreakdownButton: {
        backgroundColor: '#8E44AD',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    aiBreakdownButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    subtasksContainer: {
        marginTop: 8,
    },
    subtaskItem: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DDE3ED',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        alignItems: 'center',
    },
    subtaskText: {
        flex: 1,
        fontSize: 16,
    },
    subtaskRemoveButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    subtaskRemoveButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: 'bold',
    },
    addSubtaskContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    subtaskInput: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DDE3ED',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginRight: 8,
    },
    addSubtaskButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3498db',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addSubtaskButtonText: {
        fontSize: 24,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
});

export default CreateTaskScreen;