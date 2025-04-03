// frontend/App.tsx
import React, {useEffect, useCallback} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Ionicons} from '@expo/vector-icons';
import {View, Text, ActivityIndicator, Platform, LogBox, StyleSheet} from 'react-native';
import * as Notifications from 'expo-notifications';
import {registerForPushNotificationsAsync} from './src/services/NotificationService';
import {useFonts} from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';

// Import screens
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
// Import navigators
import TasksNavigator from './src/navigation/TasksNavigator';
// Import regular screens
import CalendarScreen from './src/screens/calendar/CalendarScreen';
import MedicationsScreen from './src/screens/medications/MedicationsScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';

// Import context
import {AuthProvider, useAuth} from './src/context/AuthContext';
import {GestureHandlerRootView} from "react-native-gesture-handler";
import MoodJournalScreen from "./src/screens/journal/MoodJournalDetailScreen";
import {patchTextComponent, patchTextRender} from './src/utils/patches';
import StatusBarManager from './src/components/StatusBarManager';

try {
    patchTextComponent();
    patchTextRender();
} catch (e) {
    console.error("Failed to patch text component", e);
}

SplashScreen.preventAutoHideAsync();

// Configure notification handlers
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Navigation types
type AuthStackParamList = {
    Login: undefined;
    Signup: undefined;
    ForgotPassword: undefined;
};

type MainTabParamList = {
    Tasks: undefined;
    Calendar: undefined;
    MoodJournal: undefined;
    Medications: undefined;
    Profile: undefined;
};

type RootStackParamList = {
    Auth: undefined;
    Main: undefined;
};

// Create navigators
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

// Auth Navigator
const AuthNavigator = () => {
    return (
        <AuthStack.Navigator screenOptions={{headerShown: false}}>
            <AuthStack.Screen name="Login" component={LoginScreen}/>
            <AuthStack.Screen name="Signup" component={SignupScreen}/>
            <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen}/>
        </AuthStack.Navigator>
    );
};

// Main App Navigator with Bottom Tabs
const MainNavigator = () => {
    return (
        <MainTab.Navigator
            screenOptions={({route}) => ({
                tabBarIcon: ({focused, color, size}) => {
                    let iconName: keyof typeof Ionicons.glyphMap;

                    if (route.name === 'Tasks') {
                        iconName = focused ? 'checkbox' : 'checkbox-outline';
                    } else if (route.name === 'Calendar') {
                        iconName = focused ? 'calendar' : 'calendar-outline';
                    } else if (route.name === 'MoodJournal') {
                        iconName = focused ? 'journal' : 'journal-outline';
                    } else if (route.name === 'Medications') {
                        iconName = focused ? 'medical' : 'medical-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person-circle' : 'person-circle-outline';
                    } else {
                        iconName = 'help-circle-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color}/>;
                },
                tabBarActiveTintColor: '#3498db',
                tabBarInactiveTintColor: 'gray',
                headerShown: false,
                // Ensure proper spacing for the tab bar to not overlap with home indicator
                tabBarStyle: {
                    paddingBottom: Platform.OS === 'ios' ? 4 : 8,
                    height: Platform.OS === 'ios' ? 88 : 60,
                    paddingTop: 8,
                }
            })}
        >
            <MainTab.Screen name="Tasks" component={TasksNavigator}/>
            <MainTab.Screen name="Calendar" component={CalendarScreen}/>
            <MainTab.Screen name="MoodJournal" component={MoodJournalScreen}/>
            <MainTab.Screen name="Medications" component={MedicationsScreen}/>
            <MainTab.Screen name="Profile" component={ProfileScreen}/>
        </MainTab.Navigator>
    );
};

// Root Navigator with auth state
const RootNavigator = () => {
    const {user, loading} = useAuth();

    // Show loading screen while checking auth state
    if (loading) {
        return (
            <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F9FC'}}>
                <ActivityIndicator size="large" color="#3498db"/>
                <Text style={{marginTop: 16, fontSize: 16, color: '#666'}}>Loading...</Text>
            </View>
        );
    }

    return (
        <RootStack.Navigator screenOptions={{headerShown: false}}>
            {user ? (
                <RootStack.Screen name="Main" component={MainNavigator}/>
            ) : (
                <RootStack.Screen name="Auth" component={AuthNavigator}/>
            )}
        </RootStack.Navigator>
    );
};

LogBox.ignoreLogs([
    'Sending `onAnimatedValueUpdate` with no listeners registered.',
    'Non-serializable values were found in the navigation state',
]);

// Main App component with providers
export default function App() {
    const [fontsLoaded] = useFonts({
        'Roboto': require('./assets/fonts/Roboto-VariableFont_wght.ttf'),
        'Roboto-Italic': require('./assets/fonts/Roboto-Italic-VariableFont_wght.ttf'),
    });

    // Both useEffect hooks must be called in the same order every render
    useEffect(() => {
        const setupNotifications = async () => {
            try {
                // Register for push notifications
                await registerForPushNotificationsAsync();

                // Set up notification handlers for when the app is in foreground
                Notifications.setNotificationHandler({
                    handleNotification: async () => ({
                        shouldShowAlert: true,
                        shouldPlaySound: true,
                        shouldSetBadge: true,
                        // Customize iOS presentation options
                        ...(Platform.OS === 'ios' && {
                            presentationOptions: [
                                Notifications.PresentationOption.BANNER,
                                Notifications.PresentationOption.SOUND,
                                Notifications.PresentationOption.BADGE,
                            ],
                        }),
                    }),
                });

                // Handle notification when app is opened from a notification
                const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
                    // Extract data from the notification
                    const data = response.notification.request.content.data;

                    // Handle different notification types
                    if (data.type === 'task-reminder' && data.taskId) {
                        // Navigate to task detail - you'll need to wrap this in a setTimeout
                        // and use a navigation ref to make this work from outside React components
                        console.log('Should navigate to task:', data.taskId);
                        // navigationRef.current?.navigate('TaskDetail', { taskId: data.taskId });
                    }
                });

                // Clean up listener when the component unmounts
                return () => {
                    Notifications.removeNotificationSubscription(responseListener);
                };
            } catch (error) {
                console.error('Error setting up notifications:', error);
            }
        };

        setupNotifications();
    }, []);

    const onLayoutRootView = useCallback(async () => {
        if (fontsLoaded) {
            await SplashScreen.hideAsync();
        }
    }, [fontsLoaded]);

    // Early return but after all hooks are called
    if (!fontsLoaded) {
        return null;
    }

    return (
        <GestureHandlerRootView style={{flex: 1}} onLayout={onLayoutRootView}>
            <SafeAreaProvider>
                <AuthProvider>
                    <NavigationContainer>
                        <RootNavigator/>
                    </NavigationContainer>
                </AuthProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
});