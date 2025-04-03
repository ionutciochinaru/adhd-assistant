// frontend/src/screens/tasks/CreateTaskScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
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
    Animated,
    Keyboard,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTaskNotifications } from '../../hooks/useTaskNotifications';
import BackButton from "../../components/BackButton";
import ScreenLayout from '../../components/ScreenLayout';
import { COLORS, SPACING, FONTS, Typography, CommonStyles } from '../../utils/styles';
import { Ionicons } from '@expo/vector-icons';

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
    const [showKeyboardTips, setShowKeyboardTips] = useState(false);
    const { scheduleTaskNotification } = useTaskNotifications();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const tipsHeight = useRef(new Animated.Value(0)).current;

    const [errors, setErrors] = useState<{
        title?: string;
        subtasks?: string;
    }>({});

    // Animation on mount
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start();

        // Set initial due date to next hour
        const nextHour = new Date();
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        setDueDate(nextHour);

        // Keyboard listeners for showing/hiding tips
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setShowKeyboardTips(true);
                Animated.timing(tipsHeight, {
                    toValue: 90,
                    duration: 300,
                    useNativeDriver: false
                }).start();
            }
        );

        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setShowKeyboardTips(false);
                Animated.timing(tipsHeight, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: false
                }).start();
            }
        );

        return () => {
            keyboardDidShowListener.remove();
            keyboardDidHideListener.remove();
        };
    }, []);

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

        // Animate the addition
        Animated.sequence([
            Animated.timing(scaleAnim, {
                toValue: 0.98,
                duration: 100,
                useNativeDriver: true
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true
            })
        ]).start();

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

                // Show success animation
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.05,
                        duration: 200,
                        useNativeDriver: true
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true
                    })
                ]).start();
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

            // Show success feedback before navigating back
            Alert.alert(
                'Success!',
                'Your task has been created',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (error: any) {
            console.error('Error creating task:', error.message);
            Alert.alert('Error', 'Failed to create task: ' + error.message);
            setLoading(false);
        }
    };

    const renderBackButton = () => (
        <BackButton onPress={() => navigation.goBack()} label="Cancel" />
    );

    const renderCreateButton = () => (
        <TouchableOpacity
            style={[
                styles.createButton,
                (loading || title.trim() === '') && styles.disabledButton
            ]}
            onPress={createTask}
            disabled={loading || title.trim() === ''}
        >
            {loading ? (
                <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
                <Text style={styles.createButtonText}>Create</Text>
            )}
        </TouchableOpacity>
    );

    return (
        <ScreenLayout
            leftComponent={renderBackButton()}
            rightComponent={renderCreateButton()}
            title="Create Task"
        >
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView style={styles.container}>
                    <Animated.View
                        style={[
                            styles.formContainer,
                            {
                                opacity: fadeAnim,
                                transform: [{ scale: scaleAnim }]
                            }
                        ]}
                    >
                        {/* Title Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                Task Title <Text style={styles.requiredStar}>*</Text>
                            </Text>
                            <TextInput
                                style={[
                                    styles.titleInput,
                                    errors.title && styles.inputError
                                ]}
                                placeholder="What do you need to do?"
                                value={title}
                                onChangeText={(text) => {
                                    setTitle(text);
                                    if (errors.title) {
                                        setErrors({...errors, title: undefined});
                                    }
                                }}
                                maxLength={100}
                                autoFocus
                            />
                            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}

                            {title.length > 0 && (
                                <Text style={styles.charCount}>
                                    {title.length}/100 characters
                                </Text>
                            )}
                        </View>

                        {/* Description Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Description (optional)</Text>
                            <TextInput
                                style={styles.descriptionInput}
                                placeholder="Add more details about this task..."
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                            />
                        </View>

                        {/* Priority Selection */}
                        <View style={styles.inputGroup}>
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
                                    <Ionicons
                                        name="arrow-down"
                                        size={16}
                                        color={priority === 'low' ? COLORS.white : COLORS.lowPriority}
                                    />
                                    <Text style={[
                                        styles.priorityButtonText,
                                        priority === 'low' && styles.selectedPriorityButtonText,
                                    ]}>Low</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.priorityButton,
                                        styles.mediumPriorityButton,
                                        priority === 'medium' && styles.selectedPriorityButton,
                                    ]}
                                    onPress={() => setPriority('medium')}
                                >
                                    <Ionicons
                                        name="remove"
                                        size={16}
                                        color={priority === 'medium' ? COLORS.white : COLORS.mediumPriority}
                                    />
                                    <Text style={[
                                        styles.priorityButtonText,
                                        priority === 'medium' && styles.selectedPriorityButtonText,
                                    ]}>Medium</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.priorityButton,
                                        styles.highPriorityButton,
                                        priority === 'high' && styles.selectedPriorityButton,
                                    ]}
                                    onPress={() => setPriority('high')}
                                >
                                    <Ionicons
                                        name="arrow-up"
                                        size={16}
                                        color={priority === 'high' ? COLORS.white : COLORS.highPriority}
                                    />
                                    <Text style={[
                                        styles.priorityButtonText,
                                        priority === 'high' && styles.selectedPriorityButtonText,
                                    ]}>High</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Due Date Toggle */}
                        <View style={styles.inputGroup}>
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
                                    trackColor={{ false: COLORS.lightGray, true: COLORS.primaryLight }}
                                    thumbColor={hasDueDate ? COLORS.primary : '#f4f3f4'}
                                    ios_backgroundColor={COLORS.lightGray}
                                />
                            </View>

                            {hasDueDate && (
                                <View style={styles.dateTimeContainer}>
                                    <View style={styles.datePreview}>
                                        <Ionicons name="calendar" size={20} color={COLORS.primary} />
                                        <Text style={styles.dateTimeText}>
                                            {dueDate.toLocaleDateString()}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.dateTimeButton}
                                            onPress={() => setShowDatePicker(true)}
                                        >
                                            <Text style={styles.dateTimeButtonText}>Change</Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.timePreview}>
                                        <Ionicons name="time" size={20} color={COLORS.primary} />
                                        <Text style={styles.dateTimeText}>
                                            {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.dateTimeButton}
                                            onPress={() => setShowTimePicker(true)}
                                        >
                                            <Text style={styles.dateTimeButtonText}>Change</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {renderDateTimePickers()}
                                </View>
                            )}
                        </View>

                        {/* AI Task Breakdown */}
                        <View style={styles.inputGroup}>
                            <View style={styles.aiBreakdownContainer}>
                                <View style={styles.aiBreakdownHeader}>
                                    <Ionicons name="bulb" size={18} color={COLORS.warning} />
                                    <Text style={styles.aiBreakdownTitle}>AI Task Breakdown</Text>
                                </View>
                                <Switch
                                    value={useAI}
                                    onValueChange={setUseAI}
                                    trackColor={{ false: COLORS.lightGray, true: COLORS.primaryLight }}
                                    thumbColor={useAI ? COLORS.primary : '#f4f3f4'}
                                    ios_backgroundColor={COLORS.lightGray}
                                />
                            </View>

                            {useAI && (
                                <View style={styles.aiInfoContainer}>
                                    <Text style={styles.aiInfoText}>
                                        Let AI help break down your task into manageable subtasks
                                    </Text>

                                    <TouchableOpacity
                                        style={[
                                            styles.aiBreakdownButton,
                                            (loading || title.trim() === '') && styles.disabledAiButton
                                        ]}
                                        onPress={requestAIBreakdown}
                                        disabled={loading || title.trim() === ''}
                                    >
                                        {loading ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <>
                                                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                                                <Text style={styles.aiBreakdownButtonText}>
                                                    Generate Subtasks
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* Subtasks Section */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>
                                Subtasks {subtasks.length > 0 ? `(${subtasks.length})` : ''}
                            </Text>

                            <View style={styles.subtasksContainer}>
                                {subtasks.map((subtask, index) => (
                                    <View key={index} style={styles.subtaskItem}>
                                        <View style={styles.subtaskBullet}>
                                            <Ionicons name="radio-button-on" size={12} color={COLORS.primary} />
                                        </View>
                                        <Text style={styles.subtaskText} numberOfLines={1}>
                                            {subtask}
                                        </Text>
                                        <TouchableOpacity
                                            style={styles.subtaskRemoveButton}
                                            onPress={() => removeSubtask(index)}
                                        >
                                            <Ionicons name="close-circle" size={18} color={COLORS.danger} />
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
                                        <Ionicons name="add" size={24} color={COLORS.white} />
                                    </TouchableOpacity>
                                </View>

                                {errors.subtasks && (
                                    <Text style={styles.errorText}>{errors.subtasks}</Text>
                                )}
                            </View>
                        </View>

                        {/* Tips for ADHD users */}
                        <View style={styles.tipsContainer}>
                            <View style={styles.tipHeader}>
                                <Ionicons name="information-circle" size={20} color={COLORS.info} />
                                <Text style={styles.tipTitle}>Tips for Success</Text>
                            </View>
                            <Text style={styles.tipText}>
                                • Break complex tasks into smaller subtasks
                            </Text>
                            <Text style={styles.tipText}>
                                • Set realistic due dates and times
                            </Text>
                            <Text style={styles.tipText}>
                                • Use priority levels to focus on what matters most
                            </Text>
                        </View>
                    </Animated.View>
                </ScrollView>

                {/* Keyboard tips */}
                <Animated.View style={[
                    styles.keyboardTipsContainer,
                    {height: tipsHeight}
                ]}>
                    {showKeyboardTips && (
                        <View style={styles.keyboardTips}>
                            <Text style={styles.keyboardTipTitle}>Keyboard Shortcuts</Text>
                            <Text style={styles.keyboardTipText}>• Tab + Enter: Add a subtask</Text>
                            <Text style={styles.keyboardTipText}>• Shift + Enter: Create task</Text>
                        </View>
                    )}
                </Animated.View>
            </KeyboardAvoidingView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.light,
    },
    formContainer: {
        padding: SPACING.md,
    },
    createButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.md,
        borderRadius: SPACING.xs,
    },
    disabledButton: {
        backgroundColor: COLORS.gray,
        opacity: 0.6,
    },
    createButtonText: {
        color: COLORS.white,
        fontSize: FONTS.size.sm,
        fontWeight: FONTS.weight.semiBold,
    },
    inputGroup: {
        marginBottom: SPACING.lg,
    },
    label: {
        ...Typography.label,
        marginBottom: SPACING.xs,
    },
    requiredStar: {
        color: COLORS.danger,
    },
    charCount: {
        ...Typography.caption,
        textAlign: 'right',
        marginTop: SPACING.xs,
    },
    titleInput: {
        ...CommonStyles.input,
        fontSize: FONTS.size.md,
        fontWeight: FONTS.weight.medium,
    },
    inputError: {
        borderColor: COLORS.danger,
    },
    errorText: {
        color: COLORS.danger,
        fontSize: FONTS.size.xs,
        marginTop: SPACING.xs,
    },
    descriptionInput: {
        ...CommonStyles.input,
        minHeight: 100,
        textAlignVertical: 'top',
    },
    priorityButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    priorityButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.sm,
        borderRadius: SPACING.xs,
        marginHorizontal: SPACING.xxs,
        borderWidth: 1,
    },
    selectedPriorityButton: {
        borderWidth: 0,
    },
    priorityButtonText: {
        ...Typography.bodyMedium,
        marginLeft: SPACING.xs,
    },
    selectedPriorityButtonText: {
        color: COLORS.white,
        fontWeight: FONTS.weight.semiBold,
    },
    lowPriorityButton: {
        borderColor: COLORS.lowPriority,
        backgroundColor: 'rgba(39, 174, 96, 0.1)',
    },
    mediumPriorityButton: {
        borderColor: COLORS.mediumPriority,
        backgroundColor: 'rgba(243, 156, 18, 0.1)',
    },
    highPriorityButton: {
        borderColor: COLORS.highPriority,
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
    },
    dueDateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateTimeContainer: {
        marginTop: SPACING.sm,
        backgroundColor: COLORS.white,
        borderRadius: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.sm,
    },
    datePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.sm,
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    timePreview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateTimeText: {
        ...Typography.bodyMedium,
        flex: 1,
        marginLeft: SPACING.sm,
    },
    dateTimeButton: {
        backgroundColor: COLORS.primaryLight,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        borderRadius: SPACING.xs,
    },
    dateTimeButtonText: {
        color: COLORS.primary,
        fontSize: FONTS.size.xs,
        fontWeight: FONTS.weight.medium,
    },
    aiBreakdownContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    aiBreakdownHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    aiBreakdownTitle: {
        ...Typography.bodyMedium,
        marginLeft: SPACING.xs,
        fontWeight: FONTS.weight.medium,
    },
    aiInfoContainer: {
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        padding: SPACING.sm,
        borderRadius: SPACING.xs,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
    },
    aiInfoText: {
        ...Typography.caption,
        color: COLORS.dark,
        marginBottom: SPACING.sm,
    },
    aiBreakdownButton: {
        backgroundColor: COLORS.primary,
        borderRadius: SPACING.xs,
        padding: SPACING.sm,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    disabledAiButton: {
        backgroundColor: COLORS.gray,
        opacity: 0.6,
    },
    aiBreakdownButtonText: {
        color: COLORS.white,
        fontSize: FONTS.size.sm,
        fontWeight: FONTS.weight.semiBold,
        marginLeft: SPACING.xs,
    },
    subtasksContainer: {
        marginBottom: SPACING.md,
    },
    subtaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: SPACING.sm,
        borderRadius: SPACING.xs,
        marginBottom: SPACING.xs,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    subtaskBullet: {
        marginRight: SPACING.xs,
    },
    subtaskText: {
        ...Typography.bodyRegular,
        flex: 1,
    },
    subtaskRemoveButton: {
        padding: SPACING.xs,
    },
    addSubtaskContainer: {
        flexDirection: 'row',
        marginBottom: SPACING.xs,
    },
    subtaskInput: {
        flex: 1,
        ...CommonStyles.input,
        marginRight: SPACING.sm,
    },
    addSubtaskButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledAddSubtaskButton: {
        backgroundColor: COLORS.gray,
        opacity: 0.6,
    },
    tipsContainer: {
        backgroundColor: COLORS.info + '15', // Light version of info color
        padding: SPACING.md,
        borderRadius: SPACING.xs,
        marginTop: SPACING.md,
        marginBottom: SPACING.xxl,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.info,
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    tipTitle: {
        ...Typography.bodyMedium,
        fontWeight: FONTS.weight.semiBold,
        marginLeft: SPACING.xs,
        color: COLORS.info,
    },
    tipText: {
        ...Typography.caption,
        color: COLORS.dark,
        marginBottom: SPACING.xs,
        lineHeight: 18,
    },
    keyboardTipsContainer: {
        backgroundColor: 'rgba(236, 240, 241, 0.97)',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        overflow: 'hidden',
    },
    keyboardTips: {
        padding: SPACING.md,
    },
    keyboardTipTitle: {
        ...Typography.bodyMedium,
        fontWeight: FONTS.weight.semiBold,
        marginBottom: SPACING.xs,
    },
    keyboardTipText: {
        ...Typography.caption,
        color: COLORS.dark,
        marginBottom: SPACING.xs,
    },
});

export default CreateTaskScreen;