import React, { useState } from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    withSpring,
    interpolate,
    Extrapolation,
    runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {Subtask, Task} from "../utils/supabase";
import {COLORS, RADIUS, SHADOWS, SPACING} from "../utils/styles";
import TaskItem from "../components/TaskItem";

type SwipeableTaskItemProps = {
    task: Task & {
        subtasks?: Subtask[];
        subtasks_count?: number;
        subtasks_completed?: number;
    };
    onPress: () => void;
    onPomodoroStart: (task: Task) => void;
    onEdit: (taskId: string) => void;
    onDelete: (taskId: string) => void;
};

const SwipeableTaskItem: React.FC<SwipeableTaskItemProps> = ({
                                                                 task,
                                                                 onPress,
                                                                 onPomodoroStart,
                                                                 onEdit,
                                                                 onDelete,
                                                             }) => {
    // Animation shared values
    const translateX = useSharedValue(0);
    const isDragging = useSharedValue(false);
    const [showOptions, setShowOptions] = useState(false);

    // Constants
    const ITEM_HEIGHT = 100;
    const SCREEN_WIDTH = 350;
    const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

    // Handle starting Pomodoro timer
    const startPomodoro = () => {
        onPomodoroStart(task);
    };

    // Pan gesture handler
    const panGesture = Gesture.Pan()
        .onBegin(() => {
            isDragging.value = true;
        })
        .onChange((event) => {
            // Only allow swiping right for Pomodoro
            if (event.translationX > 0) {
                translateX.value = event.translationX;
            }
        })
        .onEnd((event) => {
            isDragging.value = false;

            if (event.translationX > SWIPE_THRESHOLD) {
                // Swiped right - start Pomodoro
                translateX.value = withTiming(SCREEN_WIDTH, { duration: 300 }, (finished) => {
                    if (finished) {
                        runOnJS(startPomodoro)();
                        // Reset back after starting Pomodoro
                        translateX.value = withTiming(0, { duration: 300 });
                    }
                });
            } else {
                // Not enough to trigger action, spring back
                translateX.value = withSpring(0);
            }
        })
        .activeOffsetX([5, 200]) // Require a minimum movement to activate
        .failOffsetY([-20, 20]); // Fail if vertical movement is dominant

    // Animated styles
    const taskItemStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { scale: withTiming(isDragging.value ? 1.02 : 1, { duration: 100 }) }
            ],
            zIndex: 10,
        };
    });

    // Right action (Pomodoro) animated style
    const rightActionStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            translateX.value,
            [0, SWIPE_THRESHOLD],
            [0, 1],
            Extrapolation.CLAMP
        );

        const scale = interpolate(
            translateX.value,
            [0, SWIPE_THRESHOLD],
            [0.8, 1],
            Extrapolation.CLAMP
        );

        return {
            opacity,
            transform: [{ scale }],
            backgroundColor: COLORS.primary,
        };
    });

    // Toggle the options menu
    const toggleOptions = () => {
        setShowOptions(!showOptions);
    };

    return (
        <View style={styles.container}>
            {/* Right Action (Pomodoro) */}
            <Animated.View
                style={[
                    styles.actionContainer,
                    rightActionStyle
                ]}
            >
                <Ionicons
                    name="timer-outline"
                    size={24}
                    color={COLORS.white}
                />
                <Text style={styles.actionText}>Pomodoro</Text>
            </Animated.View>

            {/* Task Item with swipe gesture */}
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.taskItemWrapper, taskItemStyle]}>
                    <View style={styles.taskHeader}>
                        <TaskItem
                            task={task}
                            onPress={onPress}
                        />
                        <TouchableOpacity
                            style={styles.optionsButton}
                            onPress={toggleOptions}
                        >
                            <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Options menu that appears when three dots are tapped */}
                    {showOptions && (
                        <View style={styles.optionsMenu}>
                            <TouchableOpacity
                                style={styles.optionItem}
                                onPress={() => {
                                    setShowOptions(false);
                                    onEdit(task.id);
                                }}
                            >
                                <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                                <Text style={styles.optionText}>Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.optionItem}
                                onPress={() => {
                                    setShowOptions(false);
                                    Alert.alert(
                                        "Delete Task",
                                        "Are you sure you want to delete this task?",
                                        [
                                            {
                                                text: "Cancel",
                                                style: "cancel"
                                            },
                                            {
                                                text: "Delete",
                                                onPress: () => onDelete(task.id),
                                                style: "destructive"
                                            }
                                        ]
                                    );
                                }}
                            >
                                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                                <Text style={[styles.optionText, { color: COLORS.danger }]}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        margin: SPACING.sm,
    },
    taskItemWrapper: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        ...SHADOWS.small,
        overflow: 'visible',
        position: 'relative',
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    optionsButton: {
        padding: SPACING.sm,
        zIndex: 2,
    },
    actionContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.lg,
        backgroundColor: COLORS.primary,
    },
    actionText: {
        color: COLORS.white,
        marginHorizontal: SPACING.sm,
        fontWeight: '600',
    },
    optionsMenu: {
        position: 'absolute',
        top: SPACING.xl,
        right: SPACING.sm,
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.md,
        padding: SPACING.xs,
        width: 120,
        ...SHADOWS.medium,
        zIndex: 999,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.sm,
    },
    optionText: {
        marginLeft: SPACING.xs,
        fontSize: 14,
        color: COLORS.textPrimary,
    }
});

export default SwipeableTaskItem;