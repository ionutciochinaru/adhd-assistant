import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
    FlatList
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import BackButton from "../../components/BackButton";
import { COLORS, RADIUS, SHADOWS, SPACING, Typography, CommonStyles } from "../../utils/styles";
import ScreenLayout from "../../components/ScreenLayout";
import { supabase } from '../../utils/supabase';
import { Task, Subtask } from "../../utils/supabase";

type PomodoroScreenParams = {
    task: Task;
};

type PomodoroMode = 'pomodoro' | 'shortBreak' | 'longBreak';

const POMODORO_DURATION = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK_DURATION = 5 * 60; // 5 minutes in seconds
const LONG_BREAK_DURATION = 15 * 60; // 15 minutes in seconds

const MOTIVATIONAL_QUOTES = [
    "Every small step counts towards your goal.",
    "You're making progress, one moment at a time.",
    "Focus creates magic. Keep going!",
    "Your dedication is your superpower.",
    "Consistency beats intensity every time.",
    "You're stronger than you think.",
    "Small progress is still progress.",
];

const PomodoroScreen: React.FC = () => {
    const navigation = useNavigation<StackNavigationProp<any>>();
    const route = useRoute();
    const { task } = route.params as PomodoroScreenParams;

    const [timeLeft, setTimeLeft] = useState(POMODORO_DURATION);
    const [isRunning, setIsRunning] = useState(true);
    const [mode, setMode] = useState<PomodoroMode>('pomodoro');
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Tracking session details
    const [totalSessions, setTotalSessions] = useState(0);
    const [totalBreaks, setTotalBreaks] = useState(0);
    const [totalTimeSpent, setTotalTimeSpent] = useState(0);
    const [motivationalQuote, setMotivationalQuote] = useState('');

    // Fetch subtasks on component mount
    useEffect(() => {
        fetchSubtasks();
        // Select a random motivational quote
        setMotivationalQuote(MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)]);
    }, []);

    // Fetch subtasks for the current task
    const fetchSubtasks = async () => {
        try {
            const { data, error } = await supabase
                .from('subtasks')
                .select('*')
                .eq('task_id', task.id);

            if (error) throw error;
            setSubtasks(data || []);
        } catch (error) {
            console.error('Error fetching subtasks:', error);
        }
    };

    // Calculate minutes and seconds
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    // Update timer and tracking
    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handleTimerComplete();
                        return 0;
                    }
                    return prev - 1;
                });
                setTotalTimeSpent(prev => prev + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isRunning, mode]);

    // Handle timer completion
    const handleTimerComplete = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        // Increment sessions and breaks
        if (mode === 'pomodoro') {
            setTotalSessions(prev => prev + 1);
        } else {
            setTotalBreaks(prev => prev + 1);
        }

        // Alternate between modes
        const newMode = mode === 'pomodoro' ? 'shortBreak' : 'pomodoro';
        switchMode(newMode);
    };

    // Switch between pomodoro and break modes
    const switchMode = (newMode: PomodoroMode) => {
        setMode(newMode);
        setTimeLeft(
            newMode === 'pomodoro' ? POMODORO_DURATION :
                newMode === 'shortBreak' ? SHORT_BREAK_DURATION :
                    LONG_BREAK_DURATION
        );
        setIsRunning(true);
    };

    // Toggle timer state
    const toggleTimer = () => {
        setIsRunning(!isRunning);
    };

    // Complete task
    const handleCompleteTask = async () => {
        // Check if all subtasks are completed
        const allSubtasksCompleted = subtasks.every(
            subtask => subtask.status === 'completed'
        );

        if (!allSubtasksCompleted) {
            Alert.alert(
                'Incomplete Subtasks',
                'Please complete all subtasks before marking the task as done.',
                [{ text: "OK" }]
            );
            return;
        }

        try {
            const { error } = await supabase
                .from('tasks')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', task.id);

            if (error) throw error;

            // Navigate back and trigger a refresh
            navigation.navigate('TasksList', {
                selectDate: moment().format('YYYY-MM-DD'),
                refreshTasks: true
            });
        } catch (error) {
            console.error('Error completing task:', error);
            Alert.alert('Error', 'Failed to complete task');
        }
    };

    // Toggle subtask completion
    const toggleSubtaskCompletion = async (subtask: Subtask) => {
        try {
            const newStatus = subtask.status === 'active' ? 'completed' : 'active';

            // Update in database
            const { error } = await supabase
                .from('subtasks')
                .update({
                    status: newStatus,
                    completed_at: newStatus === 'completed' ? new Date().toISOString() : null
                })
                .eq('id', subtask.id);

            if (error) throw error;

            // Update local state
            setSubtasks(prev => prev.map(st =>
                st.id === subtask.id
                    ? {
                        ...st,
                        status: newStatus,
                        completed_at: newStatus === 'completed' ? new Date().toISOString() : null
                    }
                    : st
            ));
        } catch (error) {
            console.error('Error updating subtask:', error);
            Alert.alert('Error', 'Failed to update subtask');
        }
    };

    // Determine mode color and title
    const getModeConfig = () => {
        switch (mode) {
            case 'pomodoro':
                return {
                    title: 'Focus Session',
                    color: COLORS.primary,
                    backgroundColor: COLORS.primaryLight
                };
            case 'shortBreak':
                return {
                    title: 'Short Break',
                    color: COLORS.accent2,
                    backgroundColor: COLORS.primaryLight
                };
            case 'longBreak':
                return {
                    title: 'Long Break',
                    color: COLORS.accent3,
                    backgroundColor: COLORS.primaryLight
                };
        }
    };

    const modeConfig = getModeConfig();

    return (
        <ScreenLayout
            leftComponent={<BackButton onPress={() => navigation.goBack()} />}
            title={modeConfig.title}
        >
            <ScrollView
                contentContainerStyle={styles.container}
                keyboardShouldPersistTaps="handled"
            >
                {/* Timer Card */}
                <View style={[styles.timerCard, { backgroundColor: modeConfig.backgroundColor }]}>
                    {/* Motivational Quote */}
                    <View style={styles.timerHeaderContainer}>
                        <Text style={styles.progressText}>
                            {motivationalQuote}
                        </Text>
                    </View>

                    {/* Timer Text */}
                    <View style={styles.timerTextContainer}>
                        <Text style={[styles.timerText, { color: modeConfig.color }]}>
                            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                        </Text>
                    </View>

                    {/* Timer Controls */}
                    <View style={styles.timerControlsContainer}>
                        <TouchableOpacity
                            style={[styles.controlButton, { backgroundColor: modeConfig.color }]}
                            onPress={() => switchMode('pomodoro')}
                        >
                            <Ionicons name="play" size={20} color={COLORS.white} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.controlButton, { backgroundColor: modeConfig.color }]}
                            onPress={toggleTimer}
                        >
                            {isRunning ? (
                                <Ionicons name="pause" size={20} color={COLORS.white} />
                            ) : (
                                <Ionicons name="play" size={20} color={COLORS.white} />
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.controlButton, { backgroundColor: modeConfig.color }]}
                            onPress={() => switchMode('shortBreak')}
                        >
                            <Ionicons name="sunny" size={20} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>

                    {/* Session Stats */}
                    <View style={styles.sessionStatsContainer}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Sessions</Text>
                            <Text style={styles.statValue}>{totalSessions}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Breaks</Text>
                            <Text style={styles.statValue}>{totalBreaks}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Time Spent</Text>
                            <Text style={styles.statValue}>
                                {Math.floor(totalTimeSpent / 60)}m {totalTimeSpent % 60}s
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Task Details */}
                <View style={styles.taskDetailsContainer}>
                    <View style={styles.taskInfoCard}>
                        <Text style={styles.taskTitle}>{task.title}</Text>
                        {task.description && (
                            <Text style={styles.taskDescription}>{task.description}</Text>
                        )}
                        <View style={styles.taskMetaContainer}>
                            <View style={styles.taskMetaItem}>
                                <Ionicons
                                    name="calendar-outline"
                                    size={16}
                                    color={COLORS.textSecondary}
                                />
                                <Text style={styles.taskMetaText}>
                                    {task.due_date
                                        ? moment(task.due_date).format('MMM D, YYYY')
                                        : 'No due date'}
                                </Text>
                            </View>
                            <View style={styles.taskMetaItem}>
                                <Ionicons
                                    name="flag-outline"
                                    size={16}
                                    color={
                                        task.priority === 'high' ? COLORS.highPriority :
                                            task.priority === 'medium' ? COLORS.mediumPriority :
                                                COLORS.lowPriority
                                    }
                                />
                                <Text style={styles.taskMetaText}>
                                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Subtasks */}
                <View style={styles.subtasksContainer}>
                    <Text style={styles.sectionTitle}>Subtasks</Text>
                    {subtasks.length === 0 ? (
                        <Text style={styles.noSubtasksText}>No subtasks</Text>
                    ) : (
                        <FlatList
                            data={subtasks}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.subtaskItem,
                                        item.status === 'completed' && styles.completedSubtask
                                    ]}
                                    onPress={() => toggleSubtaskCompletion(item)}
                                >
                                    <Ionicons
                                        name={
                                            item.status === 'completed'
                                                ? "checkbox"
                                                : "square-outline"
                                        }
                                        size={24}
                                        color={
                                            item.status === 'completed'
                                                ? COLORS.success
                                                : COLORS.textSecondary
                                        }
                                    />
                                    <Text
                                        style={[
                                            styles.subtaskText,
                                            item.status === 'completed' && styles.completedSubtaskText
                                        ]}
                                    >
                                        {item.title}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                    )}
                </View>

                {/* Complete Task Button */}
                <TouchableOpacity
                    style={styles.completeTaskButton}
                    onPress={handleCompleteTask}
                >
                    <Text style={styles.completeTaskButtonText}>Complete Task</Text>
                </TouchableOpacity>
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: COLORS.background,
        paddingBottom: SPACING.xl,
    },
    timerCard: {
        ...CommonStyles.card,
        marginHorizontal: SPACING.md,
        marginVertical: SPACING.md,
        padding: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    timerHeaderContainer: {
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    progressText: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    timerTextContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: SPACING.sm,
    },
    timerText: {
        ...Typography.h2,
        fontSize: 50,
        lineHeight: 60,
        fontWeight: 'bold',
    },
    timerControlsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    controlButton: {
        width: 60,
        height: 60,
        borderRadius: RADIUS.round,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: SPACING.sm,
        ...SHADOWS.medium,
    },
    sessionStatsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statLabel: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
    },
    statValue: {
        ...Typography.bodyMedium,
        fontWeight: '600',
        color: COLORS.primary,
    },
    taskDetailsContainer: {
        marginHorizontal: SPACING.md,
        marginTop: SPACING.lg,
    },
    taskInfoCard: {
        ...CommonStyles.card,
    },
    taskTitle: {
        ...Typography.h2,
        marginBottom: SPACING.sm,
        color: COLORS.textPrimary,
    },
    taskDescription: {
        ...Typography.bodyMedium,
        color: COLORS.textSecondary,
        marginBottom: SPACING.md,
    },
    taskMetaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    taskMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    taskMetaText: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
        marginLeft: SPACING.xs,
    },
    subtasksContainer: {
        marginHorizontal: SPACING.md,
        marginTop: SPACING.lg,
    },
    sectionTitle: {
        ...Typography.h3,
        marginBottom: SPACING.md,
        color: COLORS.textPrimary,
    },
    noSubtasksText: {
        ...Typography.bodyMedium,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: SPACING.md,
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
    completedSubtask: {
        backgroundColor: COLORS.background,
    },
    subtaskText: {
        ...Typography.bodyMedium,
        marginLeft: SPACING.md,
        flex: 1,
    },
    completedSubtaskText: {
        textDecorationLine: 'line-through',
        color: COLORS.textSecondary,
    },
    completeTaskButton: {
        ...CommonStyles.buttonLarge,
        backgroundColor: COLORS.success,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.lg,
    },
    completeTaskButtonText: {
        ...Typography.bodyLarge,
        color: COLORS.white,
        fontWeight: '600',
    }
});

export default PomodoroScreen;