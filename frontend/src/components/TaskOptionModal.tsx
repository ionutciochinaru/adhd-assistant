import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, Typography, RADIUS, SHADOWS } from '../utils/styles';

type TaskOptionModalProps = {
    visible: boolean;
    task: {
        id: string;
        title: string;
        status: 'pending' | 'in-progress' | 'completed';
    } | null;
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
                <TouchableOpacity
                    style={styles.container}
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={styles.content}>
                        <Text style={styles.title}>
                            Task Options
                        </Text>

                        <View style={styles.taskPreview}>
                            <Text
                                style={styles.taskTitle}
                                numberOfLines={1}
                            >
                                {task.title}
                            </Text>
                        </View>

                        <TaskOptionButton
                            icon="create-outline"
                            iconColor={COLORS.primary}
                            text="Edit Task"
                            onPress={onEdit}
                        />

                        <TaskOptionButton
                            icon="timer-outline"
                            iconColor={COLORS.primary}
                            text="Start Pomodoro"
                            onPress={onStartPomodoro}
                        />

                        {task.status !== 'completed' ? (
                            <TaskOptionButton
                                icon="checkmark-circle-outline"
                                iconColor={COLORS.success}
                                text="Mark as Complete"
                                textColor={COLORS.success}
                                onPress={() => {
                                    onClose();
                                    onCompleteTask();
                                }}
                            />
                        ) : (
                            <TaskOptionButton
                                icon="refresh-outline"
                                iconColor={COLORS.primary}
                                text="Mark as Incomplete"
                                onPress={() => {
                                    onClose();
                                    onCompleteTask();
                                }}
                            />
                        )}

                        <TaskOptionButton
                            icon="trash-outline"
                            iconColor={COLORS.danger}
                            text="Delete Task"
                            textColor={COLORS.danger}
                            onPress={onDelete}
                        />

                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <Text style={styles.closeButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

// Extracted button component for reusability
const TaskOptionButton: React.FC<{
    icon: string;
    iconColor: string;
    text: string;
    textColor?: string;
    onPress: () => void;
}> = ({ icon, iconColor, text, textColor, onPress }) => (
    <TouchableOpacity
        style={styles.option}
        onPress={onPress}
    >
        <Ionicons name={icon} size={24} color={iconColor} />
        <Text style={[
            styles.optionText,
            textColor ? { color: textColor } : {}
        ]}>
            {text}
        </Text>
    </TouchableOpacity>
);

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
    },
    content: {
        backgroundColor: COLORS.card,
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