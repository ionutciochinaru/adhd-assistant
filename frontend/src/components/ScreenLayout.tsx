import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, Typography, RADIUS, SHADOWS } from '../utils/styles';
import StatusBarManager from './StatusBarManager';

type ScreenLayoutProps = {
    children: React.ReactNode;
    backgroundColor?: string;
    edges?: Array<'top' | 'left' | 'right' | 'bottom'>;
    title?: string;
    leftComponent?: React.ReactNode;
    rightComponent?: React.ReactNode;
    showHeader?: boolean;
    headerStyle?: object;
    contentContainerStyle?: object;
};

const ScreenLayout: React.FC<ScreenLayoutProps> = ({
                                                       children,
                                                       backgroundColor = COLORS.background,
                                                       edges = ['left', 'right'],
                                                       title,
                                                       leftComponent,
                                                       rightComponent,
                                                       showHeader = true,
                                                       headerStyle,
                                                       contentContainerStyle,
                                                   }) => {
    // Use the hook to get dynamic tab bar height
    const tabBarHeight = 0;

    // Determine if we need dark status bar based on background color
    const isDarkBackground = backgroundColor === COLORS.background ||
        backgroundColor === COLORS.card ||
        backgroundColor === COLORS.black;

    const barStyle = isDarkBackground ? 'light' : 'dark';

    return (
        <StatusBarManager
            backgroundColor={showHeader ? COLORS.card : backgroundColor}
            barStyle={barStyle}
        >
            <SafeAreaView
                style={[styles.container, { backgroundColor }]}
                edges={edges}
            >
                {showHeader && (
                    <View style={[styles.headerContainer, headerStyle]}>
                        <View style={[styles.header, headerStyle]}>
                            <View style={styles.headerLeft}>
                                {leftComponent}
                            </View>
                            {title && (
                                <Text style={styles.headerTitle} numberOfLines={1}>
                                    {title}
                                </Text>
                            )}
                            <View style={styles.headerRight}>
                                {rightComponent}
                            </View>
                        </View>
                    </View>
                )}

                {/* Dynamic padding based on tab bar height */}
                <View
                    style={[
                        styles.contentContainer,
                        contentContainerStyle
                    ]}
                >
                    {children}
                </View>
            </SafeAreaView>
        </StatusBarManager>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        paddingHorizontal: SPACING.xs,
        marginTop: SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        marginHorizontal: SPACING.xs,
        borderRadius: RADIUS.xl,
        backgroundColor: COLORS.card,
        ...SHADOWS.small,
    },
    headerLeft: {
        minWidth: 40,
        alignItems: 'flex-start',
    },
    headerTitle: {
        ...Typography.h3,
        flex: 1,
        textAlign: 'center',
        color: COLORS.textPrimary,
        paddingHorizontal: SPACING.sm,
    },
    headerRight: {
        minWidth: 40,
        alignItems: 'flex-end',
    },
    contentContainer: {
        flex: 1,
        marginTop: SPACING.md,
    }
});

export default ScreenLayout;