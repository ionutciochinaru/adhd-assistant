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
    Image,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useTaskNotifications } from '../../hooks/useTaskNotifications';
import BackButton from "../../components/BackButton";
import ScreenLayout from '../../components/ScreenLayout';
import { COLORS, SPACING, FONTS, Typography, CommonStyles, RADIUS, SHADOWS } from '../../utils/styles';
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
    const { scheduleTaskNotification } = useTaskNotifications();

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    const [errors, setErrors] = useState<{
        title?: string;
        subtasks?: string;
    }>({});

    // Animation on mount
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            })
        ]).start();

        // Set initial due date to next hour
        const nextHour = new Date();
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        setDueDate(nextHour);
    }, []);

    // Handle date picking
    const handleDateConfirm = (selectedDate: Date) => {
        setShowDatePicker(false);

        // Preserve time from existing due date
        if (hasDueDate) {
            selectedDate.setHours(
                dueDate.getHours(),
                dueDate.getMinutes(),
                dueDate.getSeconds()
            );
        }

        setDueDate(selectedDate);

        // Show time picker automatically after date is selected
        if (Platform.OS === 'android') {
            setShowTimePicker(true);
        }
    };

    // Handle time picking
    const handleTimeConfirm = (selectedTime: Date) => {
        setShowTimePicker(false);

        // Create a new date object combining the selected date and time
        const newDate = new Date(dueDate);
        newDate.setHours(
            selectedTime.getHours(),
            selectedTime.getMinutes(),
            selectedTime.getSeconds()
        );

        setDueDate(newDate);
    };

    const validateForm = (): boolean => {
        const newErrors: {title?: string; subtasks?: string} = {};

        // Validate title
        if (title.trim() === '') {
            newErrors.title = 'Please enter a task title';
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
            // This is a simulated AI breakdown
            // In a real app, this would call your backend API that uses an AI service
            setTimeout(() => {
                // Example subtasks based on the task title
                const aiGeneratedSubtasks = [
                    `Research "${title}" requirements`,
                    `Gather materials for ${title}`,
                    `Draft outline for ${title}`,
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

            if (taskError) throw taskError;

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

                if (subtasksError) throw subtasksError;
            }

            // Schedule notification if due date is set
            if (task?.id && hasDueDate) {
                await scheduleTaskNotification(task);
            }

            // Show success animation and message before navigating back
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
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0.5,
                    duration: 300,
                    useNativeDriver: true
                })
            ]).start();

            setTimeout(() => {
                navigation.goBack();
            }, 500);
        } catch (error: any) {
            console.error('Error creating task:', error.message);
            Alert.alert('Error', 'Failed to create task: ' + error.message);
            setLoading(false);
        }
    };

    // Get priority-specific styles
    const getPriorityColor = (priorityValue: string) => {
        switch (priorityValue) {
            case 'high':
                return COLORS.highPriority;
            case 'medium':
                return COLORS.mediumPriority;
            case 'low':
                return COLORS.lowPriority;
            default:
                return COLORS.textTertiary;
        }
    };

    const getPriorityBgColor = (priorityValue: string) => {
        switch (priorityValue) {
            case 'high':
                return COLORS.cardRed;
            case 'medium':
                return COLORS.cardOrange;
            case 'low':
                return COLORS.cardGreen;
            default:
                return COLORS.cardBlue;
        }
    };

    const renderBackButton = () => (
        <BackButton onPress={() => navigation.goBack()} />
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
                <ScrollView
                    style={styles.container}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View
                        style={[
                            styles.formContainer,
                            {
                                opacity: fadeAnim,
                                transform: [
                                    { translateY: slideAnim },
                                    { scale: scaleAnim }
                                ]
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
                                    styles.input,
                                    errors.title && styles.inputError
                                ]}
                                placeholder="What do you need to do?"
                                placeholderTextColor={COLORS.textTertiary}
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
                            {errors.title && (
                                <Text style={styles.errorText}>{errors.title}</Text>
                            )}

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
                                style={styles.textArea}
                                placeholder="Add more details about this task..."
                                placeholderTextColor={COLORS.textTertiary}
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
                            <View style={styles.priorityContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.priorityOption,
                                        { backgroundColor: getPriorityBgColor('low') },
                                        priority === 'low' && styles.selectedPriorityOption,
                                        priority === 'low' && { borderColor: COLORS.lowPriority }
                                    ]}
                                    onPress={() => setPriority('low')}
                                >
                                    <View style={[styles.priorityIconContainer, { backgroundColor: COLORS.lowPriority }]}>
                                        <Ionicons name="arrow-down" size={18} color={COLORS.white} />
                                    </View>
                                    <Text style={styles.priorityText}>Low</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.priorityOption,
                                        { backgroundColor: getPriorityBgColor('medium') },
                                        priority === 'medium' && styles.selectedPriorityOption,
                                        priority === 'medium' && { borderColor: COLORS.mediumPriority }
                                    ]}
                                    onPress={() => setPriority('medium')}
                                >
                                    <View style={[styles.priorityIconContainer, { backgroundColor: COLORS.mediumPriority }]}>
                                        <Ionicons name="remove" size={18} color={COLORS.white} />
                                    </View>
                                    <Text style={styles.priorityText}>Medium</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.priorityOption,
                                        { backgroundColor: getPriorityBgColor('high') },
                                        priority === 'high' && styles.selectedPriorityOption,
                                        priority === 'high' && { borderColor: COLORS.highPriority }
                                    ]}
                                    onPress={() => setPriority('high')}
                                >
                                    <View style={[styles.priorityIconContainer, { backgroundColor: COLORS.highPriority }]}>
                                        <Ionicons name="arrow-up" size={18} color={COLORS.white} />
                                    </View>
                                    <Text style={styles.priorityText}>High</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Due Date Toggle */}
                        <View style={styles.inputGroup}>
                            <View style={styles.dueDateContainer}>
                                <View style={styles.dueDateLabelContainer}>
                                    <Ionicons name="calendar" size={20} color={COLORS.primary} />
                                    <Text style={styles.dueDateLabel}>Set Due Date & Time</Text>
                                </View>
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
                                    trackColor={{ false: COLORS.cardShadow, true: COLORS.primaryLight }}
                                    thumbColor={hasDueDate ? COLORS.primary : '#f4f3f4'}
                                    ios_backgroundColor={COLORS.cardShadow}
                                />
                            </View>

                            {hasDueDate && (
                                <View style={styles.dateTimeContainer}>
                                    <TouchableOpacity
                                        style={styles.dateTimeButton}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                                        <Text style={styles.dateTimeText}>
                                            {dueDate.toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.dateTimeButton}
                                        onPress={() => setShowTimePicker(true)}
                                    >
                                        <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                                        <Text style={styles.dateTimeText}>
                                            {dueDate.toLocaleTimeString(undefined, {
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Date Time Picker Modals */}
                            <DateTimePickerModal
                                isVisible={showDatePicker}
                                mode="date"
                                onConfirm={handleDateConfirm}
                                onCancel={() => setShowDatePicker(false)}
                                date={dueDate}
                                minimumDate={new Date()}
                            />

                            <DateTimePickerModal
                                isVisible={showTimePicker}
                                mode="time"
                                onConfirm={handleTimeConfirm}
                                onCancel={() => setShowTimePicker(false)}
                                date={dueDate}
                            />
                        </View>

                        {/* AI Task Breakdown */}
                        <View style={styles.inputGroup}>
                            <View style={styles.aiBreakdownContainer}>
                                <View style={styles.aiBreakdownHeader}>
                                    <Ionicons name="sparkles" size={20} color={COLORS.primary} />
                                    <Text style={styles.aiBreakdownTitle}>AI Task Breakdown</Text>
                                </View>
                                <Switch
                                    value={useAI}
                                    onValueChange={setUseAI}
                                    trackColor={{ false: COLORS.cardShadow, true: COLORS.primaryLight }}
                                    thumbColor={useAI ? COLORS.primary : '#f4f3f4'}
                                    ios_backgroundColor={COLORS.cardShadow}
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
                                            (loading || title.trim() === '') && styles.disabledButton
                                        ]}
                                        onPress={requestAIBreakdown}
                                        disabled={loading || title.trim() === ''}
                                    >
                                        {loading ? (
                                            <ActivityIndicator size="small" color={COLORS.white} />
                                        ) : (
                                            <>
                                                <Ionicons name="flash" size={18} color={COLORS.white} />
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
                                        placeholderTextColor={COLORS.textTertiary}
                                        value={newSubtask}
                                        onChangeText={setNewSubtask}
                                        returnKeyType="done"
                                        onSubmitEditing={addSubtask}
                                    />
                                    <TouchableOpacity
                                        style={[
                                            styles.addSubtaskButton,
                                            newSubtask.trim() === '' && styles.disabledButton,
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
            </KeyboardAvoidingView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    formContainer: {
        padding: SPACING.md,
    },
    headerImageContainer: {
        alignItems: 'center',
        marginVertical: SPACING.lg,
    },
    headerImage: {
        width: 80,
        height: 80,
        marginBottom: SPACING.sm,
    },
    headerText: {
        ...Typography.h2,
        color: COLORS.primary,
    },
    createButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.md,
    },
    disabledButton: {
        backgroundColor: COLORS.textTertiary,
        opacity: 0.7,
    },
    createButtonText: {
        color: COLORS.white,
        fontSize: FONTS.size.sm,
        fontWeight: '600',
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
    input: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        fontSize: FONTS.size.md,
        color: COLORS.textPrimary,
        ...SHADOWS.small,
    },
    textArea: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        fontSize: FONTS.size.md,
        color: COLORS.textPrimary,
        minHeight: 120,
        textAlignVertical: 'top',
        ...SHADOWS.small,
    },
    inputError: {
        borderWidth: 1,
        borderColor: COLORS.danger,
    },
    errorText: {
        color: COLORS.danger,
        fontSize: FONTS.size.xs,
        marginTop: SPACING.xs,
    },
    priorityContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    priorityOption: {
        flex: 1,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginHorizontal: SPACING.xxs,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
        ...SHADOWS.small,
    },
    selectedPriorityOption: {
        borderWidth: 2,
    },
    priorityIconContainer: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.sm,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xs,
    },
    priorityText: {
        ...Typography.bodySmall,
        fontWeight: '500',
    },
    dueDateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        ...SHADOWS.small,
    },
    dueDateLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dueDateLabel: {
        ...Typography.bodyMedium,
        marginLeft: SPACING.sm,
    },
    dateTimeContainer: {
        marginTop: SPACING.sm,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    dateTimeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginHorizontal: SPACING.xxs,
        ...SHADOWS.small,
    },
    dateTimeText: {
        ...Typography.bodyMedium,
        marginLeft: SPACING.sm,
    },
    aiBreakdownContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        ...SHADOWS.small,
    },
    aiBreakdownHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    aiBreakdownTitle: {
        ...Typography.bodyMedium,
        marginLeft: SPACING.sm,
    },
    aiInfoContainer: {
        backgroundColor: COLORS.primaryLight,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginTop: SPACING.sm,
    },
    aiInfoText: {
        ...Typography.bodyMedium,
        marginBottom: SPACING.md,
    },
    aiBreakdownButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    aiBreakdownButtonText: {
        color: COLORS.white,
        fontSize: FONTS.size.md,
        fontWeight: '600',
        marginLeft: SPACING.xs,
    },
    subtasksContainer: {
        marginBottom: SPACING.md,
    },
    subtaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        marginBottom: SPACING.sm,
        ...SHADOWS.small,
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
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        fontSize: FONTS.size.md,
        color: COLORS.textPrimary,
        marginRight: SPACING.sm,
        ...SHADOWS.small,
    },
    addSubtaskButton: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.round,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    tipsContainer: {
        backgroundColor: COLORS.cardBlue,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        marginTop: SPACING.md,
        marginBottom: SPACING.xxl,
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    tipTitle: {
        ...Typography.bodyMedium,
        fontWeight: '600',
        marginLeft: SPACING.xs,
        color: COLORS.primary,
    },
    tipText: {
        ...Typography.bodySmall,
        marginBottom: SPACING.xs,
        lineHeight: 20,
    },
});

export default CreateTaskScreen;