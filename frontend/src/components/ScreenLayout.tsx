// src/components/ScreenLayout.tsx
import React from 'react';
import { View, StyleSheet, Platform, StatusBar, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, Typography } from '../utils/styles';
import { Ionicons } from '@expo/vector-icons';

type ScreenLayoutProps = {
    children: React.ReactNode;
    backgroundColor?: string;
    edges?: Array<'top' | 'right' | 'bottom' | 'left'>;
    title?: string;
    leftComponent?: React.ReactNode;
    rightComponent?: React.ReactNode;
    showHeader?: boolean;
};

const ScreenLayout: React.FC<ScreenLayoutProps> = ({
                                                       children,
                                                       backgroundColor = COLORS.light,
                                                       edges = ['top', 'left', 'right'],
                                                       title,
                                                       leftComponent,
                                                       rightComponent,
                                                       showHeader = true
                                                   }) => {
    const statusBarHeight = StatusBar.currentHeight || 0;

    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor }]}
            edges={edges}
        >
            {/* Additional padding for status bar on Android when translucent */}
            {Platform.OS === 'android' && StatusBar.currentHeight ? (
                <View style={{ height: statusBarHeight }} />
            ) : null}

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
            {children}
        </SafeAreaView>
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
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerLeft: {
        alignItems: 'flex-start',
    },
    headerTitle: {
        ...Typography.label,
        flex: 1,
        textAlign: 'center',
    },
    headerRight: {
        alignItems: 'flex-end',
    }
});

export default ScreenLayout;