import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../utils/styles';

type StatusBarManagerProps = {
    backgroundColor?: string;
    barStyle?: 'light' | 'dark' | 'auto';
    children?: React.ReactNode;
    translucent?: boolean;
};

const StatusBarManager: React.FC<StatusBarManagerProps> = ({
                                                               backgroundColor = COLORS.background,
                                                               barStyle = 'light',
                                                               children,
                                                               translucent = false,
                                                           }) => {
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <StatusBar style={barStyle} translucent={translucent} />

            {/* This spacer view creates padding for the status bar on Android */}
            {!translucent && (
                <View
                    style={[
                        styles.statusBarSpacer,
                        {
                            height: insets.top,
                            backgroundColor
                        }
                    ]}
                />
            )}

            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    statusBarSpacer: {
        width: '100%',
    },
});

export default StatusBarManager;