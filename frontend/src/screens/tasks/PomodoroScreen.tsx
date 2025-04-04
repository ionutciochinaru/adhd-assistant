import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    BackHandler,
    Dimensions
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    Easing,
    interpolate,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import BackButton from "../../components/BackButton";
import {COLORS, RADIUS, SHADOWS, SPACING, Typography} from "../../utils/styles";
import ScreenLayout from "../../components/ScreenLayout";
import {Task} from "../../utils/supabase";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
type PomodoroScreenParams = {
    task: Task;
};

type PomodoroMode = 'pomodoro' | 'shortBreak' | 'longBreak';

const POMODORO_DURATION = 25 * 60; // 25 minutes in seconds
const SHORT_BREAK_DURATION = 5 * 60; // 5 minutes in seconds
const LONG_BREAK_DURATION = 15 * 60; // 15 minutes in seconds
const TOTAL_INTERVALS = 4;

const { width } = Dimensions.get('window');
const CIRCLE_SIZE = width * 0.7;

const PomodoroScreen: React.FC = () => {
    const navigation = useNavigation<StackNavigationProp<any>>();
    const route = useRoute();
    const { task } = route.params as PomodoroScreenParams;

    const [timeLeft, setTimeLeft] = useState(POMODORO_DURATION);
    const [isRunning, setIsRunning] = useState(true);
    const [mode, setMode] = useState<PomodoroMode>('pomodoro');
    const [currentInterval, setCurrentInterval] = useState(1);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Animation values
    const progress = useSharedValue(0);
    const buttonScale = useSharedValue(1);

    // Calculate minutes and seconds
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    // Get the total time for the current mode
    const getTotalTime = (): number => {
        switch (mode) {
            case 'pomodoro':
                return POMODORO_DURATION;
            case 'shortBreak':
                return SHORT_BREAK_DURATION;
            case 'longBreak':
                return LONG_BREAK_DURATION;
        }
    };

    // Update progress animation
    useEffect(() => {
        const totalTime = getTotalTime();
        progress.value = withTiming(1 - (timeLeft / totalTime), {
            duration: 1000,
            easing: Easing.linear
        });
    }, [timeLeft, mode]);

    // Set up the timer
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

    // Handle Android back button
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            handleExit();
            return true;
        });

        return () => backHandler.remove();
    }, []);

    // Handle timer completion
    const handleTimerComplete = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        // Play sound or vibration here

        if (mode === 'pomodoro') {
            if (currentInterval < TOTAL_INTERVALS) {
                Alert.alert(
                    "Pomodoro Complete!",
                    "Time for a short break.",
                    [{ text: "OK", onPress: () => switchMode('shortBreak') }]
                );
            } else {
                Alert.alert(
                    "Pomodoro Complete!",
                    "Time for a long break. Good job completing 4 pomodoros!",
                    [{ text: "OK", onPress: () => switchMode('longBreak') }]
                );
            }
        } else {
            if (mode === 'longBreak') {
                // Reset intervals after a long break
                setCurrentInterval(1);
            } else {
                // Increment interval after a short break
                setCurrentInterval(prev => prev + 1);
            }

            Alert.alert(
                "Break Complete!",
                "Ready to focus again?",
                [{ text: "OK", onPress: () => switchMode('pomodoro') }]
            );
        }
    };

    // Switch between pomodoro and break modes
    const switchMode = (newMode: PomodoroMode) => {
        setMode(newMode);

        switch (newMode) {
            case 'pomodoro':
                setTimeLeft(POMODORO_DURATION);
                break;
            case 'shortBreak':
                setTimeLeft(SHORT_BREAK_DURATION);
                break;
            case 'longBreak':
                setTimeLeft(LONG_BREAK_DURATION);
                break;
        }

        setIsRunning(true);
    };

    // Toggle timer state
    const toggleTimer = () => {
        buttonScale.value = withTiming(1.2, { duration: 100 }, () => {
            buttonScale.value = withTiming(1, { duration: 100 });
        });
        setIsRunning(!isRunning);
    };

    // Reset timer
    const resetTimer = () => {
        setTimeLeft(getTotalTime());
        setIsRunning(false);
    };

    // Handle exit confirmation
    const handleExit = () => {
        if (isRunning) {
            Alert.alert(
                "Exit Pomodoro",
                "Are you sure you want to exit? Your progress will be lost.",
                [
                    { text: "Stay", style: "cancel" },
                    { text: "Exit", onPress: () => navigation.goBack() }
                ]
            );
        } else {
            navigation.goBack();
        }
    };

    // Animated styles
    const circleStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotate: `${progress.value * 360}deg` }]
        };
    });

    const progressStyle = useAnimatedStyle(() => {
        return {
            strokeDashoffset: interpolate(
                progress.value,
                [0, 1],
                [CIRCLE_SIZE * Math.PI, 0]
            )
        };
    });

    const buttonStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: buttonScale.value }]
        };
    });

    const renderBackButton = () => (
        <BackButton onPress={handleExit} />
    );

    const getModeColor = (): string => {
        switch (mode) {
            case 'pomodoro':
                return COLORS.primary;
            case 'shortBreak':
                return COLORS.success;
            case 'longBreak':
                return COLORS.info;
        }
    };

    return (
        <ScreenLayout
            leftComponent={renderBackButton()}
            title={task.title}
        >
            <View style={styles.container}>
                <View style={styles.taskContainer}>
                    <Text style={styles.taskCategory}>Planner/Task</Text>
                    <Text style={styles.taskTitle}>{task.title}</Text>
                </View>

                <View style={styles.modeButtonsContainer}>
                    <TouchableOpacity
                        style={[
                            styles.modeButton,
                            mode === 'pomodoro' && styles.activeModeButton,
                            mode === 'pomodoro' && { backgroundColor: COLORS.primaryLight }
                        ]}
                        onPress={() => switchMode('pomodoro')}
                    >
                        <Text style={[
                            styles.modeButtonText,
                            mode === 'pomodoro' && { color: COLORS.primary }
                        ]}>
                            Pomodoro
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.modeButton,
                            mode === 'shortBreak' && styles.activeModeButton,
                            mode === 'shortBreak' && { backgroundColor: COLORS.cardGreen }
                        ]}
                        onPress={() => switchMode('shortBreak')}
                    >
                        <Text style={[
                            styles.modeButtonText,
                            mode === 'shortBreak' && { color: COLORS.success }
                        ]}>
                            Short break
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.modeButton,
                            mode === 'longBreak' && styles.activeModeButton,
                            mode === 'longBreak' && { backgroundColor: COLORS.cardBlue }
                        ]}
                        onPress={() => switchMode('longBreak')}
                    >
                        <Text style={[
                            styles.modeButtonText,
                            mode === 'longBreak' && { color: COLORS.info }
                        ]}>
                            Long break
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.timerContainer}>
                    {/* Progress Circle */}
                    <Animated.View style={[styles.progressCircleContainer, circleStyle]}>
                        <View style={styles.background}>
                            <View style={styles.circleContainer}>
                                <Svg height={CIRCLE_SIZE} width={CIRCLE_SIZE}>
                                    {/* Background Circle */}
                                    <Circle
                                        cx={CIRCLE_SIZE / 2}
                                        cy={CIRCLE_SIZE / 2}
                                        r={CIRCLE_SIZE / 2 - 15}
                                        stroke={getModeColor() + '40'} // Add transparency
                                        strokeWidth={10}
                                        fill="transparent"
                                    />

                                    {/* Progress Circle */}
                                    <AnimatedCircle
                                        cx={CIRCLE_SIZE / 2}
                                        cy={CIRCLE_SIZE / 2}
                                        r={CIRCLE_SIZE / 2 - 15}
                                        stroke={getModeColor()}
                                        strokeWidth={10}
                                        fill="transparent"
                                        strokeDasharray={CIRCLE_SIZE * Math.PI}
                                        style={progressStyle}
                                        strokeLinecap="round"
                                    />
                                </Svg>
                            </View>
                        </View>
                    </Animated.View>

                    {/* Timer Display */}
                    <View style={styles.timerTextContainer}>
                        <Text style={styles.timerFocusText}>Focus</Text>
                        <Text style={styles.timerText}>
                            {minutes.toString().padStart(2, '0')} : {seconds.toString().padStart(2, '0')}
                        </Text>
                        <Text style={styles.timerStatusText}>
                            {isRunning ? 'Running...' : 'Paused'}
                        </Text>
                    </View>

                    <Text style={styles.intervalText}>
                        {currentInterval} of {TOTAL_INTERVALS} intervals
                    </Text>
                </View>

                <View style={styles.controlsContainer}>
                    <TouchableOpacity
                        style={styles.resetButton}
                        onPress={resetTimer}
                    >
                        <Ionicons name="refresh" size={24} color={COLORS.white} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.continueButton}
                        onPress={toggleTimer}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.continueButtonText}>
                            {isRunning ? 'Pause' : 'Continue'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.squareButton}
                        onPress={handleExit}
                    >
                        <Ionicons name="square" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                </View>
            </View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: SPACING.md,
        backgroundColor: COLORS.white,
    },
    taskContainer: {
        marginVertical: SPACING.lg,
        alignItems: 'center',
    },
    taskCategory: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    taskTitle: {
        ...Typography.h2,
        textAlign: 'center',
    },
    modeButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xl,
    },
    modeButton: {
        flex: 1,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.xs,
        backgroundColor: COLORS.cardShadow,
        borderRadius: RADIUS.round,
        marginHorizontal: SPACING.xxs,
        alignItems: 'center',
    },
    activeModeButton: {
        backgroundColor: COLORS.primaryLight,
    },
    modeButtonText: {
        ...Typography.bodySmall,
        fontWeight: '500',
        color: COLORS.textSecondary,
    },
    timerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: SPACING.xl,
    },
    progressCircleContainer: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    background: {
        position: 'absolute',
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        backgroundColor: COLORS.white,
    },
    circleContainer: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        borderRadius: CIRCLE_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: '-90deg' }],
    },
    timerTextContainer: {
        position: 'absolute',
        alignItems: 'center',
    },
    timerFocusText: {
        ...Typography.bodyMedium,
        color: COLORS.textSecondary,
        marginBottom: SPACING.sm,
    },
    timerText: {
        ...Typography.h1,
        fontSize: 48,
        marginBottom: SPACING.xs,
    },
    timerStatusText: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
    },
    intervalText: {
        ...Typography.bodyMedium,
        marginTop: SPACING.lg,
        color: COLORS.textSecondary,
    },
    controlsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 'auto',
        marginBottom: SPACING.xl,
    },
    resetButton: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.round,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    continueButton: {
        flex: 1,
        height: 50,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: SPACING.md,
        ...SHADOWS.small,
    },
    continueButtonText: {
        ...Typography.bodyMedium,
        color: COLORS.white,
        fontWeight: '600',
    },
    squareButton: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    }
});

export default PomodoroScreen;