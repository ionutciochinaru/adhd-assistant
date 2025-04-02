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
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackScreenProps } from '@react-navigation/stack';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTaskNotifications } from '../../hooks/useTaskNotifications';
import ScreenLayout from '../../components/ScreenLayout';
import BackButton from "../../components/BackButton";

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
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [subtasks, setSubtasks] = useState<string[]>([]);
    const [newSubtask, setNewSubtask] = useState('');
    const [loading, setLoading] = useState(false);
    const [useAI, setUseAI] = useState(false);
    const { scheduleTaskNotification } = useTaskNotifications();

    const [errors, setErrors] = useState<{
        title?: string;
        subtasks?: string;
    }>({});

    // Handle date change
    const onDateChange = (event: any, selectedDate?: Date) => {
        const currentDate = selectedDate || dueDate;

        // On iOS, the date picker will be dismissed automatically
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
            // Immediately show time picker on Android
            setShowTimePicker(true);
        }

        setDueDate(currentDate);
    };

    // Handle time change
    const onTimeChange = (event: any, selectedTime?: Date) => {
        // Close time picker
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
        }

        if (selectedTime) {
            // Combine the selected date with the selected time
            const newDateTime = new Date(dueDate);
            newDateTime.setHours(selectedTime.getHours());
            newDateTime.setMinutes(selectedTime.getMinutes());
            setDueDate(newDateTime);
        }
    };

    const validateForm = (): boolean => {
        const newErrors: {title?: string; subtasks?: string} = {};

        // Validate title
        if (title.trim() === '') {
            newErrors.title = 'Task title is required';
        } else if (title.length > 100) {
            newErrors.title = 'Title must be less than 100 characters';
        }

        // Validate subtasks if needed
        if (subtasks.length > 20) {
            newErrors.subtasks = 'Maximum of 20 subtasks allowed';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Render date and time pickers
    const renderDateTimePickers = () => {
        if (!hasDueDate) return null;

        return (
            <View>
                {(showDatePicker || Platform.OS === 'ios') && (
                    <DateTimePicker
                        value={dueDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                        minimumDate={new Date()}
                    />
                )}
                {(showTimePicker || Platform.OS === 'ios') && (
                    <DateTimePicker
                        value={dueDate}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onTimeChange}
                    />
                )}
            </View>
        );
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
        if (!validateForm()) {
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

            // Schedule notification if due date is set
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
        <ScreenLayout>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView style={styles.container}>
                    <View style={styles.header}>
                        <BackButton onPress={() => navigation.goBack()} label="Cancel" />
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
                            style={[styles.titleInput, errors.title && styles.inputError]}
                            placeholder="Enter task title"
                            value={title}
                            onChangeText={(text) => {
                                setTitle(text);
                                if (errors.title) {
                                    setErrors({...errors, title: undefined});
                                }
                            }}
                            maxLength={100}
                        />
                        {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

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
                                onValueChange={(value) => {
                                    setHasDueDate(value);
                                    if (value) {
                                        // Set to next hour when enabling
                                        const nextHour = new Date();
                                        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
                                        setDueDate(nextHour);
                                    }
                                }}
                                trackColor={{ false: '#D1D1D6', true: '#BFE9FF' }}
                                thumbColor={hasDueDate ? '#3498db' : '#F4F4F4'}
                            />
                        </View>

                        {hasDueDate && (
                            <>
                                <TouchableOpacity
                                    onPress={() => setShowDatePicker(true)}
                                    style={styles.selectedDateTimeContainer}
                                >
                                    <Text style={styles.selectedDateTimeText}>
                                        {dueDate.toLocaleString()}
                                    </Text>
                                </TouchableOpacity>

                                {renderDateTimePickers()}
                            </>
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
                                    style={[
                                        styles.addSubtaskButton,
                                        newSubtask.trim() === '' && styles.disabledAddSubtaskButton,
                                    ]}
                                    onPress={addSubtask}
                                    disabled={newSubtask.trim() === ''}
                                >
                                    <Text style={styles.addSubtaskButtonText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    selectedDateTimeContainer: {
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 8,
        marginVertical: 10,
        alignItems: 'center',
    },
    selectedDateTimeText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2c3e50',
    },
    cancelButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#95a5a6',
    },
    createButton: {
        backgroundColor: '#3498db',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    createButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    formContainer: {
        padding: 16,
    },
    inputError: {
        borderColor: '#e74c3c',
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 12,
        marginTop: 4,
        marginBottom: 8,
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 8,
    },
    titleInput: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    descriptionInput: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        height: 100,
        textAlignVertical: 'top',
        marginBottom: 16,
    },
    priorityButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    priorityButton: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
    },
    selectedPriorityButton: {
        borderWidth: 2,
    },
    priorityButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    lowPriorityButton: {
        backgroundColor: '#e8f5e9',
        borderColor: '#27ae60',
    },
    mediumPriorityButton: {
        backgroundColor: '#fff8e1',
        borderColor: '#f39c12',
    },
    highPriorityButton: {
        backgroundColor: '#ffebee',
        borderColor: '#e74c3c',
    },
    dueDateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    datePickerContainer: {
        marginBottom: 16,
    },
    dateButton: {
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
    },
    dateButtonText: {
        fontSize: 16,
        color: '#2c3e50',
    },
    aiBreakdownContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    aiBreakdownButton: {
        backgroundColor: '#3498db',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        marginBottom: 16,
    },
    aiBreakdownButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    subtasksContainer: {
        marginBottom: 20,
    },
    subtaskItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    subtaskText: {
        flex: 1,
        fontSize: 14,
        color: '#2c3e50',
    },
    subtaskRemoveButton: {
        padding: 4,
    },
    subtaskRemoveButtonText: {
        fontSize: 18,
        color: '#e74c3c',
        fontWeight: 'bold',
    },
    addSubtaskContainer: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    subtaskInput: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        marginRight: 8,
    },
    addSubtaskButton: {
        backgroundColor: '#3498db',
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    disabledAddSubtaskButton: {
        backgroundColor: '#bdc3c7',
    },
    addSubtaskButtonText: {
        color: '#ffffff',
        fontWeight: '600',
    },
});

export default CreateTaskScreen;