import React, { createContext, useState, useEffect, useContext } from 'react';
import { Alert } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../utils/supabase';

// Define the shape of our context
type AuthContextType = {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error?: string }>;
    signUp: (email: string, password: string) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<{ error?: string }>;
    updateUser: (data: { name?: string; avatar_url?: string }) => Promise<{ error?: string }>;
};

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    signIn: async () => ({ }),
    signUp: async () => ({ }),
    signOut: async () => {},
    resetPassword: async () => ({ }),
    updateUser: async () => ({ }),
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Provider component that wraps the app and makes auth object available
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    // Handle session persistence
    useEffect(() => {
        // Check for existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Set up listener for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                setLoading(false);
            }
        );

        // Clean up the subscription
        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Sign in with email and password
    const signIn = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            return {};
        } catch (error: any) {
            console.error('Error signing in:', error.message);
            return { error: error.message };
        }
    };

    // Sign up with email and password
    const signUp = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;

            // If signUp was successful but confirmation is required
            if (data?.user && !data?.session) {
                return { error: 'Please check your email for confirmation link' };
            }

            return {};
        } catch (error: any) {
            console.error('Error signing up:', error.message);
            return { error: error.message };
        }
    };

    // Sign out
    const signOut = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error: any) {
            console.error('Error signing out:', error.message);
            Alert.alert('Error', 'There was a problem signing out.');
        }
    };

    // Reset password
    const resetPassword = async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            return {};
        } catch (error: any) {
            console.error('Error resetting password:', error.message);
            return { error: error.message };
        }
    };

    // Update user profile
    const updateUser = async (updates: { name?: string; avatar_url?: string }) => {
        try {
            const { error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user?.id);

            if (error) throw error;
            return {};
        } catch (error: any) {
            console.error('Error updating user:', error.message);
            return { error: error.message };
        }
    };

    // Value for the context provider
    const value = {
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};