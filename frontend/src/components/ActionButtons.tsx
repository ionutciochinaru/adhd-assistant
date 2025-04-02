import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SPACING } from '../utils/styles';

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
                    <ActivityIndicator size="small" color="#FFFFFF" />
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
    },
    cancelButton: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        marginRight: SPACING.sm,
    },
    cancelButtonText: {
        color: COLORS.gray,
        fontSize: 16,
        fontWeight: '500',
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        borderRadius: 4,
    },
    disabledSaveButton: {
        backgroundColor: COLORS.gray,
        opacity: 0.7,
    },
    saveButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ActionButtons;