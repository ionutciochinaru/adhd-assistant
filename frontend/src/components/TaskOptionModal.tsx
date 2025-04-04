// src/components/TaskOptionModal.tsx
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../utils/supabase';
import { COLORS, SPACING, Typography, RADIUS, SHADOWS } from '../utils/styles';

type TaskOptionModalProps = {
    visible: boolean;
    task: Task | null;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onStartPomodoro: () => void;
    onCompleteTask: () => void;
};

const TaskOptionModal: React.FC<TaskOptionModalProps> = ({
                                                             visible,
                                                             task,
                                                             onClose,
                                                             onEdit,
                                                             onDelete,
                                                             onStartPomodoro,
                                                             onCompleteTask
                                                         }) => {
    if (!task) return null;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.container}>
                    <View style={styles.content}>
                        <Text style={styles.title}>
                            Task Options
                        </Text>

                        <View style={styles.taskPreview}>
                            <Text style={styles.taskTitle} numberOfLines={1}>
                                {task.title}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.option}
                            onPress={onEdit}
                        >
                            <Ionicons name="create-outline" size={24} color={COLORS.primary} />
                            <Text style={styles.optionText}>Edit Task</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.option}
                            onPress={onStartPomodoro}
                        >
                            <Ionicons name="timer-outline" size={24} color={COLORS.primary} />
                            <Text style={styles.optionText}>Start Pomodoro</Text>
                        </TouchableOpacity>

                        {task.status !== 'completed' ? (
                            <TouchableOpacity
                                style={styles.option}
                                onPress={() => {
                                    onClose();
                                    onCompleteTask();
                                }}
                            >
                                <Ionicons name="checkmark-circle-outline" size={24} color={COLORS.success} />
                                <Text style={[styles.optionText, { color: COLORS.success }]}>Mark as Complete</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.option}
                                onPress={() => {
                                    onClose();
                                    onCompleteTask();
                                }}
                            >
                                <Ionicons name="refresh-outline" size={24} color={COLORS.primary} />
                                <Text style={styles.optionText}>Mark as Incomplete</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.option}
                            onPress={onDelete}
                        >
                            <Ionicons name="trash-outline" size={24} color={COLORS.danger} />
                            <Text style={[styles.optionText, styles.deleteText]}>Delete Task</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <Text style={styles.closeButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '80%',
        maxWidth: 400,
        backgroundColor: 'transparent',
    },
    content: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        ...SHADOWS.large,
    },
    title: {
        ...Typography.h3,
        textAlign: 'center',
        marginBottom: SPACING.md,
    },
    taskPreview: {
        backgroundColor: COLORS.cardBlue,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        marginBottom: SPACING.md,
    },
    taskTitle: {
        ...Typography.bodyMedium,
        textAlign: 'center',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    optionText: {
        ...Typography.bodyMedium,
        marginLeft: SPACING.md,
    },
    deleteText: {
        color: COLORS.danger,
    },
    closeButton: {
        marginTop: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.cardShadow,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    closeButtonText: {
        ...Typography.bodyMedium,
        color: COLORS.textSecondary,
    },
});

export default TaskOptionModal;