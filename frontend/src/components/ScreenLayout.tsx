import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, Typography } from '../utils/styles';
import StatusBarManager from './StatusBarManager';
import {useTabBarHeight} from "../hooks/useTabBarHeight";

type ScreenLayoutProps = {
    children: React.ReactNode;
    backgroundColor?: string;
    edges?: Array<'left' | 'right' | 'bottom'>;
    title?: string;
    leftComponent?: React.ReactNode;
    rightComponent?: React.ReactNode;
    showHeader?: boolean;
};

const ScreenLayout: React.FC<ScreenLayoutProps> = ({
                                                       children,
                                                       backgroundColor = COLORS.white,
                                                       edges = ['left', 'right'],
                                                       title,
                                                       leftComponent,
                                                       rightComponent,
                                                       showHeader = true,
                                                   }) => {
    // Use the new hook to get dynamic tab bar height
    const tabBarHeight = useTabBarHeight();

    return (
        <StatusBarManager backgroundColor={showHeader ? COLORS.white : backgroundColor}>
            <SafeAreaView
                style={[styles.container, { backgroundColor }]}
                edges={edges}
            >
                {showHeader && (
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            {leftComponent}
                        </View>
                        {title && <Text style={styles.headerTitle}>{title}</Text>}
                        <View style={styles.headerRight}>
                            {rightComponent}
                        </View>
                    </View>
                )}

                {/* Dynamic padding based on tab bar height */}
                <View style={[styles.contentContainer, { paddingBottom: tabBarHeight / 2 }]}>
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
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: COLORS.white,
        borderBottomWidth: 0,
        borderBottomColor: COLORS.border,
    },
    headerLeft: {
        minWidth: 40,
        alignItems: 'flex-start',
    },
    headerTitle: {
        ...Typography.label,
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '600',
    },
    headerRight: {
        minWidth: 40,
        alignItems: 'flex-end',
    },
    contentContainer: {
        flex: 1,
    }
});

export default ScreenLayout;