import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, Typography, SHADOWS } from '../utils/styles';

type BackButtonProps = {
    onPress: () => void;
    label?: string;
    color?: string;
    showLabel?: boolean;
};

const BackButton = ({
                        onPress,
                        label = 'Back',
                        color = COLORS.primary,
                        showLabel = false
                    }: BackButtonProps) => {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            accessibilityLabel={`Go back to ${label}`}
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <View style={styles.buttonContent}>
                <Ionicons name="chevron-back" size={24} color={color} />
                {showLabel && (
                    <Text style={[styles.text, { color }]}>{label}</Text>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: SPACING.sm,
        borderRadius: RADIUS.md,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    text: {
        ...Typography.bodyMedium,
        marginLeft: SPACING.xs,
    },
});

export default BackButton;