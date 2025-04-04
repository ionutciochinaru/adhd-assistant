import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    interpolate,
    Extrapolation,
    runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import TaskItem from './TaskItem';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/styles';
import { Task, Subtask } from '../utils/supabase';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
type SwipeableTaskItemProps = {
    task: Task & {
        subtasks?: Subtask[];
        subtasks_count?: number;
        subtasks_completed?: number;
    };
    onPress: () => void;
    onTaskUpdate: (updatedTask: Task) => void;
    onDelete?: (taskId: string) => void;
    simultaneousHandlers?: any; // Allow ref from SectionList
};

const SWIPE_THRESHOLD = 100; // pixels to trigger action
const SCREEN_WIDTH = 400; // You might want to use Dimensions.get('window').width

const SwipeableTaskItem: React.FC<SwipeableTaskItemProps> = ({
                                                                 task,
                                                                 onPress,
                                                                 onTaskUpdate,
                                                                 onDelete,
                                                                 simultaneousHandlers,
                                                             }) => {
    // Shared values for animation
    const translateX = useSharedValue(0);
    const isSwipeActive = useSharedValue(false);

    // Complete task and its subtasks
    const completeTaskAndSubtasks = async () => {
        try {
            // Update task status
            const { data: updatedTask, error: taskError } = await supabase
                .from('tasks')
                .update({
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })
                .eq('id', task.id)
                .select()
                .single();

            if (taskError) throw taskError;

            // Update all subtasks
            if (task.subtasks && task.subtasks.length > 0) {
                const { error: subtasksError } = await supabase
                    .from('subtasks')
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString()
                    })
                    .eq('task_id', task.id);

                if (subtasksError) throw subtasksError;
            }

            // Call onTaskUpdate with the updated task
            onTaskUpdate({
                ...updatedTask,
                subtasks: task.subtasks?.map(subtask => ({
                    ...subtask,
                    status: 'completed',
                    completed_at: new Date().toISOString()
                })) || []
            });
        } catch (error) {
            console.error('Error completing task:', error);
            Alert.alert('Error', 'Failed to complete task');
        }
    };

    // Delete task and its subtasks
    const deleteTaskAndSubtasks = async () => {
        try {
            // Delete subtasks first
            const { error: subtasksError } = await supabase
                .from('subtasks')
                .delete()
                .eq('task_id', task.id);

            if (subtasksError) throw subtasksError;

            // Delete the task
            const { error: taskError } = await supabase
                .from('tasks')
                .delete()
                .eq('id', task.id);

            if (taskError) throw taskError;

            // Call onDelete if provided
            onDelete && onDelete(task.id);
        } catch (error) {
            console.error('Error deleting task:', error);
            Alert.alert('Error', 'Failed to delete task');
        }
    };

    // Pan gesture handler using Reanimated
    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            if (Math.abs(event.translationX) > Math.abs(event.translationY)) {
                // Detect horizontal swipe
                translateX.value = event.translationX;
            }
        })
        .onEnd((event) => {
            if (event.translationX < -SWIPE_THRESHOLD) {
                translateX.value = withTiming(-SCREEN_WIDTH, {}, () => {
                    runOnJS(deleteTaskAndSubtasks)();
                });
            } else if (event.translationX > SWIPE_THRESHOLD) {
                translateX.value = withTiming(SCREEN_WIDTH, {}, () => {
                    runOnJS(completeTaskAndSubtasks)();
                });
            } else {
                translateX.value = withTiming(0);
            }
        });


    // Animated styles for task item and actions
    const animatedTaskStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX.value }],
        };
    });

    const animatedLeftActionStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            translateX.value,
            [0, SWIPE_THRESHOLD],
            [0, 1],
            Extrapolation.CLAMP
        );
        return {
            opacity,
            backgroundColor: COLORS.success,
            transform: [
                {
                    scale: interpolate(
                        translateX.value,
                        [0, SWIPE_THRESHOLD],
                        [0.8, 1],
                        Extrapolation.CLAMP
                    )
                }
            ]
        };
    });

    const animatedRightActionStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            translateX.value,
            [0, -SWIPE_THRESHOLD],
            [0, 1],
            Extrapolation.CLAMP
        );
        return {
            opacity,
            backgroundColor: COLORS.danger,
            transform: [
                {
                    scale: interpolate(
                        translateX.value,
                        [0, -SWIPE_THRESHOLD],
                        [0.8, 1],
                        Extrapolation.CLAMP
                    )
                }
            ]
        };
    });

    return (
        <View style={styles.container}>
            {/* Left Action (Complete) */}
            <Animated.View
                style={[
                    styles.actionContainer,
                    styles.leftAction,
                    animatedLeftActionStyle
                ]}
            >
                <Ionicons
                    name="checkmark-done-circle"
                    size={24}
                    color={COLORS.white}
                />
                <Text style={styles.actionText}>Complete</Text>
            </Animated.View>

            {/* Right Action (Delete) */}
            <Animated.View
                style={[
                    styles.actionContainer,
                    styles.rightAction,
                    animatedRightActionStyle
                ]}
            >
                <Ionicons
                    name="trash-outline"
                    size={24}
                    color={COLORS.white}
                />
                <Text style={styles.actionText}>Delete</Text>
            </Animated.View>

            {/* Task Item */}
            <GestureDetector gesture={panGesture} simultaneousHandlers={simultaneousHandlers}>
                <View style={styles.taskItemWrapper}>
                    <TaskItem task={task} onPress={onPress} />
                </View>
            </GestureDetector>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        marginHorizontal: SPACING.md,
        marginVertical: SPACING.sm,
    },
    taskItemWrapper: {
        zIndex: 10,
    },
    actionContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        borderRadius: RADIUS.lg,
        paddingHorizontal: SPACING.md,
        overflow: 'hidden',
    },
    leftAction: {
        left: 0,
        right: 0,
        backgroundColor: COLORS.success,
    },
    rightAction: {
        left: 0,
        right: 0,
        backgroundColor: COLORS.danger,
    },
    actionText: {
        color: COLORS.white,
        marginLeft: SPACING.sm,
    }
});

export default SwipeableTaskItem;