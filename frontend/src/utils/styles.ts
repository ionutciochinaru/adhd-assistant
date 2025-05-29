import { StyleSheet, Platform } from 'react-native';

export const COLORS = {
    // Primary brand colors - blue is calming for ADHD per research
    primary: '#3B82F6',       // Vibrant but not overwhelming blue
    primaryLight: '#93C5FD',  // Lighter blue for subtle highlights
    primaryDark: '#1E40AF',   // Deep blue for important elements

    // Accent colors - carefully selected for ADHD friendliness
    accent1: '#EF4444',       // Clear red for high priorities/alerts (used sparingly)
    accent2: '#F59E0B',       // Warm orange for medium priority
    accent3: '#10B981',       // Calming green for success/completion

    // UI colors - darker backgrounds as preferred
    background: '#1F2937',    // Dark blue-gray background (easier on eyes than pure black)
    card: '#2D3748',          // Slightly lighter than background for cards
    cardShadow: '#111827',    // Darker shadow for depth

    // Status colors - clear distinction for better recognition
    success: '#10B981',       // Vibrant but not harsh green
    warning: '#F59E0B',       // Warm orange
    danger: '#EF4444',        // Clear red
    info: '#6366F1',          // Purple for info

    // Text colors - high contrast for readability on dark backgrounds
    textPrimary: '#F9FAFB',   // Almost white for primary text
    textSecondary: '#E5E7EB', // Light gray for secondary text
    textTertiary: '#9CA3AF',  // Medium gray for tertiary text
    textLight: '#FFFFFF',     // Pure white for highlights

    // Specific UI elements
    border: '#4B5563',        // Medium gray border for subtle separation
    divider: '#374151',       // Slightly darker than border for visual hierarchy
    inputBackground: '#374151', // Dark input fields

    // Task priority colors - clear distinction
    lowPriority: '#10B981',    // Green
    mediumPriority: '#F59E0B', // Orange
    highPriority: '#EF4444',   // Red

    // Basic colors
    white: '#FFFFFF',
    black: '#000000',
    gray: '#666666',
    lightGray: '#9a9a9a',
    transparent: 'transparent',

    // Card backgrounds with opacity for different contexts
    cardRed: '#4B1113',       // Dark red background
    cardOrange: '#4D3308',    // Dark orange background
    cardGreen: '#064E3B',     // Dark green background
    cardBlue: '#1E3A8A',      // Dark blue background
    cardPurple: '#4C1D95',    // Dark purple background

    // New Mood Colors for MoodJournalListScreen
    moodTerrible: '#EF4444', // Rating 1 (Danger red)
    moodBad: '#F87171',      // Rating 2 (Lighter red/pinkish)
    moodOkay: '#F59E0B',     // Rating 3 (Warning orange)
    moodGood: '#34D399',     // Rating 4 (Lighter green)
    moodGreat: '#10B981',    // Rating 5 (Success green)
};

export const MOOD_EMOJI_MAP = {
    1: '😰', // Terrible
    2: '😕', // Bad
    3: '😐', // Okay
    4: '🙂', // Good
    5: '😄', // Great
};

export const MOOD_COLOR_MAP = {
    1: COLORS.moodTerrible,
    2: COLORS.moodBad,
    3: COLORS.moodOkay,
    4: COLORS.moodGood,
    5: COLORS.moodGreat,
};

export const SPACING = {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    bottomNavBar: 60
};

export const RADIUS = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    round: 999, // For fully rounded elements
};

export const SHADOWS = {
    small: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    medium: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    large: {
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
};

// Font configuration based on inspiration
export const FONTS = {
    // Font families
    family: {
        base: 'Roboto', // Using the available font
        italic: 'Roboto-Italic',
    },
    // Font weights - using proper TypeScript types for React Native
    weight: {
        thin: '100' as const,
        light: '300' as const,
        regular: 'normal' as const,
        medium: '500' as const,
        semiBold: '600' as const,
        bold: 'bold' as const,
        black: '900' as const,
    },
    // Font sizes
    size: {
        xxs: 10,
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
        xxxl: 32,
    },
    // Line heights
    lineHeight: {
        tight: 1.2,
        normal: 1.5,
        loose: 1.8,
    },
};

// Text styles
export const Typography = StyleSheet.create({
    // Headings
    h1: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.bold,
        fontSize: FONTS.size.xxxl,
        color: COLORS.textPrimary,
        lineHeight: FONTS.size.xxxl * 1.2,
    },
    h2: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.bold,
        fontSize: FONTS.size.xxl,
        color: COLORS.textPrimary,
        lineHeight: FONTS.size.xxl * 1.2,
    },
    h3: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.semiBold,
        fontSize: FONTS.size.xl,
        color: COLORS.textPrimary,
        lineHeight: FONTS.size.xl * 1.2,
    },
    h4: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.semiBold,
        fontSize: FONTS.size.lg,
        color: COLORS.textPrimary,
        lineHeight: FONTS.size.lg * 1.2,
    },

    // Body text
    bodyLarge: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.regular,
        fontSize: FONTS.size.lg,
        color: COLORS.textPrimary,
        lineHeight: FONTS.size.lg * 1.5,
    },
    bodyRegular: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.regular,
        fontSize: FONTS.size.md,
        color: COLORS.textPrimary,
        lineHeight: FONTS.size.md * 1.5,
    },
    bodyMedium: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.medium,
        fontSize: FONTS.size.md,
        color: COLORS.textPrimary,
        lineHeight: FONTS.size.md * 1.5,
    },
    bodySmall: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.regular,
        fontSize: FONTS.size.sm,
        color: COLORS.textSecondary,
        lineHeight: FONTS.size.sm * 1.5,
    },
    bodyBold: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.bold,
        fontSize: FONTS.size.md,
        color: COLORS.textPrimary,
        lineHeight: FONTS.size.md * 1.5,
    },

    // Caption/small text
    caption: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.regular,
        fontSize: FONTS.size.xs,
        color: COLORS.textTertiary,
        lineHeight: FONTS.size.xs * 1.5,
    },
    captionBold: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.medium,
        fontSize: FONTS.size.xs,
        color: COLORS.textTertiary,
        lineHeight: FONTS.size.xs * 1.5,
    },
    tiny: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.regular,
        fontSize: FONTS.size.xxs,
        color: COLORS.textTertiary,
        lineHeight: FONTS.size.xxs * 1.2,
    },

    // Links
    link: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.medium,
        fontSize: FONTS.size.md,
        color: COLORS.primary,
        textDecorationLine: 'none',
    },

    // Label for form inputs
    label: {
        fontFamily: FONTS.family.base,
        fontWeight: FONTS.weight.medium,
        fontSize: FONTS.size.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
});

// Common component styles
export const CommonStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.card,
        ...SHADOWS.small,
    },
    headerTitle: {
        ...Typography.h3,
    },

    // Card styles based on the inspiration images
    card: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginVertical: SPACING.sm,
        ...SHADOWS.small,
    },
    taskCard: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        marginVertical: SPACING.sm,
        marginHorizontal: SPACING.md,
        ...SHADOWS.small,
        borderLeftWidth: 4,  // For priority indicator
    },
    listCard: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        marginVertical: SPACING.sm,
        marginHorizontal: SPACING.md,
        ...SHADOWS.small,
    },

    // Button styles
    button: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        ...SHADOWS.small,
    },
    buttonText: {
        ...Typography.bodyMedium,
        color: COLORS.white,
    },
    buttonLarge: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        ...SHADOWS.small,
    },
    buttonTextLarge: {
        ...Typography.bodyBold,
        color: COLORS.white,
    },

    // Badge styles for statuses and tags
    badge: {
        paddingVertical: SPACING.xxs,
        paddingHorizontal: SPACING.sm,
        borderRadius: RADIUS.round,
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
    },
    badgeText: {
        ...Typography.tiny,
        fontWeight: FONTS.weight.medium,
        color: COLORS.white,
    },

    // Floating action button (FAB)
    fab: {
        position: 'absolute',
        bottom: SPACING.xl,
        right: SPACING.xl,
        width: 60,
        height: 60,
        borderRadius: RADIUS.round,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
    },

    // Progress bar
    progressBarContainer: {
        height: 8,
        backgroundColor: COLORS.cardShadow,
        borderRadius: RADIUS.round,
        overflow: 'hidden',
        marginVertical: SPACING.sm,
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.round,
    },

    // Checkbox
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: RADIUS.sm,
        borderWidth: 2,
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm,
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },

    // Tab styles
    tabBar: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        paddingVertical: SPACING.sm,
        paddingHorizontal: SPACING.xs,
        borderRadius: RADIUS.lg,
        marginHorizontal: SPACING.md,
        marginVertical: SPACING.sm,
        ...SHADOWS.small,
    },
    tab: {
        flex: 1,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        borderRadius: RADIUS.md,
    },
    activeTab: {
        backgroundColor: COLORS.primaryLight,
    },
    tabText: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
    },
    activeTabText: {
        ...Typography.bodyMedium,
        color: COLORS.primary,
    },

    // Calendar day styles
    calendarDay: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.sm,
        justifyContent: 'center',
        alignItems: 'center',
        margin: SPACING.xxs,
    },
    calendarDayText: {
        ...Typography.bodySmall,
    },
    calendarDayActive: {
        backgroundColor: COLORS.primary,
    },
    calendarDayActiveText: {
        color: COLORS.white,
        fontWeight: FONTS.weight.bold,
    },

    // Task priority styles
    priorityLow: {
        borderLeftColor: COLORS.lowPriority,
    },
    priorityMedium: {
        borderLeftColor: COLORS.mediumPriority,
    },
    priorityHigh: {
        borderLeftColor: COLORS.highPriority,
    },

    // Empty state
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    emptyStateText: {
        ...Typography.bodyMedium,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: SPACING.md,
    },
    input: {
        backgroundColor: COLORS.inputBackground,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        fontSize: FONTS.size.md,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    inputFocused: {
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    inputError: {
        borderColor: COLORS.danger,
        shadowColor: COLORS.danger,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    inputDisabled: {
        backgroundColor: COLORS.divider,
        color: COLORS.textTertiary,
        opacity: 0.5,
    },
    textArea: {
        backgroundColor: COLORS.inputBackground,
        borderRadius: RADIUS.md,
        padding: SPACING.md,
        fontSize: FONTS.size.md,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
        height: 120,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    textAreaFocused: {
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    textAreaError: {
        borderColor: COLORS.danger,
        shadowColor: COLORS.danger,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
});