// frontend/src/utils/styles.ts
import { StyleSheet, Platform } from 'react-native';

export const COLORS = {
    primary: '#3498db',
    primaryLight: '#E1F0FE',
    primaryDark: '#2980b9',
    success: '#2ecc71',
    warning: '#f39c12',
    danger: '#e74c3c',
    info: '#9b59b6',
    light: '#f8f9fa',
    dark: '#2c3e50',
    gray: '#7f8c8d',
    lightGray: '#ecf0f1',
    border: '#E5E5E5',
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    lowPriority: '#27ae60',
    mediumPriority: '#f39c12',
    highPriority: '#e74c3c',
};

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

// Font configuration for variable font
export const FONTS = {
    // Font families
    family: {
        base: 'Roboto',
        italic: 'Roboto-Italic',
    },
    // Font weights
    weight: {
        thin: Platform.OS === 'ios' ? '100' : '100',
        light: Platform.OS === 'ios' ? '300' : '300',
        regular: Platform.OS === 'ios' ? '400' : 'normal',
        medium: Platform.OS === 'ios' ? '500' : '500',
        semiBold: Platform.OS === 'ios' ? '600' : '600',
        bold: Platform.OS === 'ios' ? '700' : 'bold',
        black: Platform.OS === 'ios' ? '900' : '900',
    },
    // Font sizes
    size: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        xxxl: 32,
    },
};

// Text styles
export const Typography = StyleSheet.create({
    // Headings
    h1: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.bold,
        fontSize: FONTS.size.xxxl,
        color: COLORS.dark,
    },
    h2: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.bold,
        fontSize: FONTS.size.xxl,
        color: COLORS.dark,
    },
    h3: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.semiBold,
        fontSize: FONTS.size.xl,
        color: COLORS.dark,
    },

    // Body text
    bodyRegular: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.regular,
        fontSize: FONTS.size.md,
        color: COLORS.dark,
    },
    bodyMedium: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.medium,
        fontSize: FONTS.size.md,
        color: COLORS.dark,
    },
    bodyBold: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.bold,
        fontSize: FONTS.size.md,
        color: COLORS.dark,
    },

    // Caption/small text
    caption: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.regular,
        fontSize: FONTS.size.xs,
        color: COLORS.gray,
    },

    // Links
    link: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.medium,
        fontSize: FONTS.size.md,
        color: COLORS.primary,
        textDecorationLine: 'underline',
    },

    // Label for form inputs
    label: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.medium,
        fontSize: FONTS.size.sm,
        color: COLORS.dark,
        marginBottom: 8,
    },
});

// Common component styles
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
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.semiBold,
        fontSize: FONTS.size.lg,
        color: COLORS.dark,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: SPACING.md,
        marginVertical: SPACING.sm,
        marginHorizontal: SPACING.md,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    button: {
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        padding: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.medium,
        fontSize: FONTS.size.md,
        color: COLORS.white,
    },
    input: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: SPACING.md,
        fontFamily: FONTS.family.base,
        fontSize: FONTS.size.md,
    },
});