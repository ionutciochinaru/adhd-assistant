// frontend/src/components/ScreenLayout.tsx
import React from 'react';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenLayoutProps = {
    children: React.ReactNode;
    backgroundColor?: string;
    edges?: Array<'top' | 'right' | 'bottom' | 'left'>;
};

/**
 * A common layout component for screens that properly handles the status bar
 * and safe area insets across different platforms.
 */
const ScreenLayout: React.FC<ScreenLayoutProps> = ({
                                                       children,
                                                       backgroundColor = '#F7F9FC',
                                                       edges = ['top', 'left', 'right']
                                                   }) => {
    const statusBarHeight = StatusBar.currentHeight || 0;

    return (
        <SafeAreaView
            style={[
                styles.container,
                { backgroundColor }
            ]}
            edges={edges}
        >
            {/* Additional padding for status bar on Android when translucent */}
            {Platform.OS === 'android' && (
                <View style={{ height: statusBarHeight }} />
            )}
            {children}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    }
});

export default ScreenLayout;