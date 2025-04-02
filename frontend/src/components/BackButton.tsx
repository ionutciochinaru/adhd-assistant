import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../utils/styles';

type BackButtonProps = {
    onPress: () => void;
    label?: string;
    color?: string;
};

const BackButton = ({ onPress, label = 'Back', color = COLORS.primary }: BackButtonProps) => {
    return (
        <TouchableOpacity
            style={styles.container}
            onPress={onPress}
            accessibilityLabel={`Go back to previous screen`}
            accessibilityRole="button"
        >
            <Ionicons name="arrow-back" size={24} color={color} style={styles.icon} />
            <Text style={[styles.text, { color }]}>{label}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.sm,
    },
    icon: {
        marginRight: 4,
    },
    text: {
        fontSize: 16,
        fontWeight: '500',
    },
});

export default BackButton;