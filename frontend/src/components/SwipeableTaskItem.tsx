import React from 'react';
import {View, Text, StyleSheet, Alert} from 'react-native';
import Animated, {
    useAnimatedStyle,
    interpolate,
    Extrapolation
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import TaskItem from './TaskItem';
import { COLORS, SPACING, RADIUS } from '../utils/styles';
import { Task, Subtask } from '../utils/supabase';

type SwipeableTaskItemProps = {
    task: Task & {
        subtasks?: Subtask[];
        subtasks_count?: number;
        subtasks_completed?: number;
    };
    onPress: () => void;
    onTaskUpdate: (updatedTask: Task) => void;
    onDelete?: (taskId: string) => void;
};

const SWIPE_THRESHOLD = 100; // pixels to trigger action

const SwipeableTaskItem: React.FC<SwipeableTaskItemProps> = ({
                                                                 task,
                                                                 onPress,
                                                                 onTaskUpdate,
                                                                 onDelete
                                                             }) => {
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

    // Gesture handler
    const [translateX, setTranslateX] = React.useState(0);
    const [isSwipeActive, setIsSwipeActive] = React.useState(false);

    const panGesture = Gesture.Pan()
        .onUpdate((event) => {
            if (event.translationX < 0) {
                // Swiping left to delete
                setTranslateX(Math.max(event.translationX, -SWIPE_THRESHOLD));
                setIsSwipeActive(true);
            } else if (event.translationX > 0) {
                // Swiping right to complete
                setTranslateX(Math.min(event.translationX, SWIPE_THRESHOLD));
                setIsSwipeActive(true);
            }
        })
        .onEnd((event) => {
            if (event.translationX < -SWIPE_THRESHOLD) {
                // Delete action
                deleteTaskAndSubtasks();
            } else if (event.translationX > SWIPE_THRESHOLD) {
                // Complete action
                completeTaskAndSubtasks();
            }

            // Reset translation
            setTranslateX(0);
            setIsSwipeActive(false);
        });

    // Animated styles
    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateX: translateX }]
        };
    });

    const leftActionStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            translateX,
            [0, SWIPE_THRESHOLD],
            [0, 1],
            Extrapolation.CLAMP
        );
        return {
            opacity,
            backgroundColor: COLORS.success
        };
    });

    const rightActionStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            translateX,
            [0, -SWIPE_THRESHOLD],
            [0, 1],
            Extrapolation.CLAMP
        );
        return {
            opacity,
            backgroundColor: COLORS.danger
        };
    });

    return (
        <View style={styles.container}>
            {/* Left Action (Complete) */}
            <Animated.View style={[styles.actionContainer, styles.leftAction, leftActionStyle]}>
                <Ionicons
                    name="checkmark-done-circle"
                    size={24}
                    color={COLORS.white}
                />
                <Text style={styles.actionText}>Complete</Text>
            </Animated.View>

            {/* Right Action (Delete) */}
            <Animated.View style={[styles.actionContainer, styles.rightAction, rightActionStyle]}>
                <Ionicons
                    name="trash-outline"
                    size={24}
                    color={COLORS.white}
                />
                <Text style={styles.actionText}>Delete</Text>
            </Animated.View>

            {/* Task Item */}
            <GestureDetector gesture={panGesture}>
                <Animated.View style={animatedStyle}>
                    <TaskItem
                        task={task}
                        onPress={onPress}
                        onToggleCompletion={() => completeTaskAndSubtasks()}
                    />
                </Animated.View>
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
    actionContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        borderRadius: RADIUS.lg,
        paddingHorizontal: SPACING.md,
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