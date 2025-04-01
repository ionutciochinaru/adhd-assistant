import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from './src/utils/supabase';
import { Session } from '@supabase/supabase-js';

// Import screens (will be created later)
// Auth Screens
const LoginScreen = () => <View><Text>Login Screen</Text></View>;
const SignupScreen = () => <View><Text>Signup Screen</Text></View>;
const ForgotPasswordScreen = () => <View><Text>Forgot Password Screen</Text></View>;

// Main App Screens
const TasksScreen = () => <View><Text>Tasks Screen</Text></View>;
const CalendarScreen = () => <View><Text>Calendar Screen</Text></View>;
const MoodJournalScreen = () => <View><Text>Mood Journal Screen</Text></View>;
const MedicationsScreen = () => <View><Text>Medications Screen</Text></View>;
const ProfileScreen = () => <View><Text>Profile Screen</Text></View>;

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
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Signup" component={SignupScreen} />
            <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </AuthStack.Navigator>
    );
};

// Main App Navigator
const MainNavigator = () => {
    return (
        <MainTab.Navigator>
            <MainTab.Screen name="Tasks" component={TasksScreen} />
            <MainTab.Screen name="Calendar" component={CalendarScreen} />
            <MainTab.Screen name="MoodJournal" component={MoodJournalScreen} />
            <MainTab.Screen name="Medications" component={MedicationsScreen} />
            <MainTab.Screen name="Profile" component={ProfileScreen} />
        </MainTab.Navigator>
    );
};

// Root Navigator - switches between Auth and Main flows
export default function App() {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if there's an active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Set up listener for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        // Cleanup subscription
        return () => subscription.unsubscribe();
    }, []);

    // Show loading screen while checking authentication
    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <RootStack.Navigator screenOptions={{ headerShown: false }}>
                    {session ? (
                        <RootStack.Screen name="Main" component={MainNavigator} />
                    ) : (
                        <RootStack.Screen name="Auth" component={AuthNavigator} />
                    )}
                </RootStack.Navigator>
            </NavigationContainer>
            <StatusBar style="auto" />
        </SafeAreaProvider>
    );
}