import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SHADOWS, SPACING, RADIUS, Typography } from '../utils/styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';

const CustomTabBar = ({ state, descriptors, navigation }) => {
    const [fabOpen, setFabOpen] = useState(false);
    const insets = useSafeAreaInsets();

    // Animation values
    const firstItemAnimation = useRef(new Animated.Value(0)).current;
    const secondItemAnimation = useRef(new Animated.Value(0)).current;
    const rotateAnimation = useRef(new Animated.Value(0)).current;
    const bgFade = useRef(new Animated.Value(0)).current;

    // Rotate the main FAB plus icon to X
    const spin = rotateAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '45deg']
    });

    // Toggle FAB menu
    const toggleFab = () => {
        if (fabOpen) {
            // Close the menu
            Animated.parallel([
                Animated.timing(firstItemAnimation, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(secondItemAnimation, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(rotateAnimation, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(bgFade, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start(() => setFabOpen(false));
        } else {
            setFabOpen(true);
            // Open the menu
            Animated.parallel([
                Animated.timing(firstItemAnimation, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(secondItemAnimation, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(rotateAnimation, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(bgFade, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    };

    // Navigation to nested screen
    const navigateToNestedScreen = (stackName, screenName, params = {}) => {
        toggleFab();
        // Navigate to the Tasks stack first
        navigation.dispatch(
            CommonActions.navigate({
                name: stackName,
                params: {}, // Empty params for the stack itself
            })
        );

        // Then navigate to the screen inside that stack with a slight delay
        setTimeout(() => {
            navigation.dispatch(
                CommonActions.navigate({
                    name: stackName,
                    params: {
                        screen: screenName,
                        params: params,
                    },
                })
            );
        }, 50);
    };

    // Filter out Calendar tab
    const visibleRoutes = state.routes.filter(route =>
        route.name !== 'Calendar'
    );

    return (
        <>
            {/* Backdrop when FAB is open */}
            {fabOpen && (
                <Animated.View
                    style={[
                        styles.backdrop,
                        { opacity: bgFade }
                    ]}
                    pointerEvents="auto"
                    onStartShouldSetResponder={() => {
                        toggleFab();
                        return true;
                    }}
                    accessibilityLabel="Close menu"
                    accessibilityRole="button"
                />
            )}

            {/* FAB Menu Options */}
            <Animated.View
                style={[
                    styles.fabMenuItem,
                    {
                        bottom: 80 + insets.bottom,
                        right: 20,
                        opacity: firstItemAnimation,
                        transform: [
                            {
                                translateY: firstItemAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -70]
                                })
                            }
                        ],
                        zIndex: fabOpen ? 10 : -1,
                    },
                ]}
                pointerEvents={fabOpen ? 'auto' : 'none'}
            >
                <View style={styles.fabMenuItemLabelContainer}>
                    <Text style={styles.fabMenuItemLabel}>New Task</Text>
                </View>
                <TouchableOpacity
                    style={styles.fabMenuItemButton}
                    onPress={() => {
                        navigateToNestedScreen('Tasks', 'CreateTask', {
                            selectedDate: new Date().toISOString().split('T')[0]
                        });
                    }}
                    accessibilityLabel="Create new task"
                    accessibilityRole="button"
                >
                    <Ionicons name="add-circle" size={24} color={COLORS.white} />
                </TouchableOpacity>
            </Animated.View>

            <Animated.View
                style={[
                    styles.fabMenuItem,
                    {
                        bottom: 80 + insets.bottom,
                        right: 20,
                        opacity: secondItemAnimation,
                        transform: [
                            {
                                translateY: secondItemAnimation.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, -140]
                                })
                            }
                        ],
                        zIndex: fabOpen ? 10 : -1,
                    },
                ]}
                pointerEvents={fabOpen ? 'auto' : 'none'}
            >
                <View style={styles.fabMenuItemLabelContainer}>
                    <Text style={styles.fabMenuItemLabel}>Record Task</Text>
                </View>
                <TouchableOpacity
                    style={[styles.fabMenuItemButton, { backgroundColor: COLORS.accent1 }]}
                    onPress={() => {
                        toggleFab();
                        // Voice recording functionality will be added later
                        alert('Voice recording functionality coming soon!');
                    }}
                    accessibilityLabel="Record new task with voice"
                    accessibilityRole="button"
                >
                    <Ionicons name="mic" size={24} color={COLORS.white} />
                </TouchableOpacity>
            </Animated.View>

            {/* Tab Bar Container */}
            <View style={[
                styles.containerWrapper,
                {
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 16,
                },
            ]}>
                {/* Floating Tab Bar */}
                <View style={styles.container}>
                    {visibleRoutes.slice(0, 4).map((route, index) => {
                        const { options } = descriptors[route.key];
                        const label =
                            options.tabBarLabel !== undefined
                                ? options.tabBarLabel
                                : options.title !== undefined
                                    ? options.title
                                    : route.name;

                        const isFocused = state.index === state.routes.indexOf(route);

                        // Determine icon name based on route and focus state
                        let iconName;
                        if (route.name === 'Tasks') {
                            iconName = isFocused ? 'checkbox' : 'checkbox-outline';
                        } else if (route.name === 'MoodJournal') {
                            iconName = isFocused ? 'journal' : 'journal-outline';
                        } else if (route.name === 'Medications') {
                            iconName = isFocused ? 'medical' : 'medical-outline';
                        } else if (route.name === 'Profile') {
                            iconName = isFocused ? 'person-circle' : 'person-circle-outline';
                        } else {
                            iconName = 'help-circle-outline';
                        }

                        const onPress = () => {
                            const event = navigation.emit({
                                type: 'tabPress',
                                target: route.key,
                                canPreventDefault: true,
                            });

                            if (!isFocused && !event.defaultPrevented) {
                                navigation.navigate({ name: route.name, merge: true });
                            }
                        };

                        return (
                            <TouchableOpacity
                                key={route.key}
                                accessibilityRole="button"
                                accessibilityState={isFocused ? { selected: true } : {}}
                                accessibilityLabel={options.tabBarAccessibilityLabel || `${label} tab`}
                                testID={options.tabBarTestID}
                                onPress={onPress}
                                style={styles.tabItem}
                            >
                                <View style={[
                                    styles.iconContainer,
                                    isFocused && styles.activeIconContainer
                                ]}>
                                    <Ionicons
                                        name={iconName}
                                        size={24}
                                        color={isFocused ? COLORS.primary : COLORS.textTertiary}
                                    />
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* FAB button that transforms into X */}
                <Animated.View
                    style={[
                        styles.fabButtonContainer,
                        {
                            transform: [{ rotate: spin }],
                            zIndex: 15 // Keep it above backdrop
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.fabButton}
                        onPress={toggleFab}
                        activeOpacity={0.8}
                        accessibilityLabel={fabOpen ? "Close menu" : "Open menu"}
                        accessibilityRole="button"
                        accessibilityHint="Double tap to open or close the action menu"
                    >
                        <Ionicons name="add" size={26} color={COLORS.white} />
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    containerWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
    },
    container: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.xl,
        paddingVertical: SPACING.sm,
        alignItems: 'center',
        justifyContent: 'space-around',
        flex: 1,
        marginRight: SPACING.sm,
        ...SHADOWS.medium,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.round,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    activeIconContainer: {
        backgroundColor: COLORS.primaryLight,
        ...SHADOWS.small,
    },
    tabLabel: {
        ...Typography.tiny,
        marginTop: SPACING.xxs,
        fontWeight: '600',
    },
    fabButtonContainer: {
        width: 56,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fabButton: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.round,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
        zIndex: 15,
        borderWidth: 2,
        borderColor: COLORS.primaryDark,
    },
    fabMenuItem: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
    },
    fabMenuItemButton: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.round,
        backgroundColor: COLORS.accent3,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
        borderWidth: 4,
        borderColor: 'rgba(0,0,0,0.1)',
    },
});

export default CustomTabBar;