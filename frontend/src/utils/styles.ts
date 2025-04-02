// frontend/src/utils/styles.ts
import { StyleSheet } from 'react-native';

export const COLORS = {
    primary: '#3498db',       // Blue for primary actions
    primaryLight: '#E1F0FE',  // Light blue for highlights
    primaryDark: '#2980b9',   // Dark blue for pressed states
    success: '#2ecc71',       // Green for success and completion
    warning: '#f39c12',       // Orange for warnings and medium priority
    danger: '#e74c3c',        // Red for errors and high priority
    info: '#9b59b6',          // Purple for info and neutral states
    light: '#f8f9fa',         // Light background
    dark: '#2c3e50',          // Dark text
    gray: '#7f8c8d',          // Gray for secondary text
    lightGray: '#ecf0f1',     // Light gray for backgrounds
    border: '#E5E5E5',        // Border color
    white: '#FFFFFF',         // White
    black: '#000000',         // Black
    transparent: 'transparent',// Transparent

    // Task priorities
    lowPriority: '#27ae60',   // Green variant
    mediumPriority: '#f39c12', // Orange/amber
    highPriority: '#e74c3c',  // Red
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const FONTS = {
    regular: {
        fontWeight: '400',
    },
    medium: {
        fontWeight: '500',
    },
    semiBold: {
        fontWeight: '600',
    },
    bold: {
        fontWeight: '700',
    },
    sizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        xxxl: 32,
    }
};

export const SHADOWS = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 5,
    },
};

export const CommonStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.light,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: FONTS.sizes.lg,
        fontWeight: '600',
        color: COLORS.dark,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: SPACING.md,
        marginHorizontal: SPACING.md,
        marginVertical: SPACING.sm,
        ...SHADOWS.small,
    },
});