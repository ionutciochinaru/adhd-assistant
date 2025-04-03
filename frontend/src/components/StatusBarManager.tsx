// frontend/src/components/StatusBarManager.tsx
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../utils/styles';

type StatusBarManagerProps = {
    backgroundColor?: string;
    barStyle?: 'light' | 'dark' | 'auto';
    children?: React.ReactNode;
};

const StatusBarManager: React.FC<StatusBarManagerProps> = ({
                                                               backgroundColor = COLORS.white,
                                                               barStyle = 'dark',
                                                               children,
                                                           }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <StatusBar style={barStyle} />
            {/* This spacer view creates padding for the status bar */}
            <View style={[styles.statusBarSpacer, { height: insets.top }]} />
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    statusBarSpacer: {
        backgroundColor: 'transparent',
    },
});

export default StatusBarManager;