import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, Typography, RADIUS, SHADOWS } from '../utils/styles';

type ActionButtonsProps = {
    onCancel: () => void;
    onSave: () => void;
    cancelText?: string;
    saveText?: string;
    loading?: boolean;
    disabled?: boolean;
};

const ActionButtons = ({
                           onCancel,
                           onSave,
                           cancelText = 'Cancel',
                           saveText = 'Save',
                           loading = false,
                           disabled = false,
                       }: ActionButtonsProps) => {
    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancel}
                disabled={loading}
                accessibilityLabel={cancelText}
                accessibilityRole="button"
            >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[
                    styles.saveButton,
                    disabled && styles.disabledSaveButton,
                ]}
                onPress={onSave}
                disabled={disabled || loading}
                accessibilityLabel={saveText}
                accessibilityRole="button"
            >
                {loading ? (
                    <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                    <Text style={styles.saveButtonText}>{saveText}</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
    },
    cancelButton: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        marginRight: SPACING.md,
        borderRadius: RADIUS.md,
        // A bit of visual contrast for easier clicking
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.background,
    },
    cancelButtonText: {
        ...Typography.bodyMedium,
        color: COLORS.textSecondary,
    },
    saveButton: {
        ...SHADOWS.small,
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 100,
    },
    disabledSaveButton: {
        backgroundColor: COLORS.border,
        opacity: 0.7,
    },
    saveButtonText: {
        ...Typography.bodyMedium,
        color: COLORS.white,
        fontWeight: 'bold',
    },
});

export default ActionButtons;