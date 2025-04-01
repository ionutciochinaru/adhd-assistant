// frontend/src/context/AuthContext.tsx
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
        // Better session initialization
        const initializeAuth = async () => {
            try {
                setLoading(true);
                console.log('Initializing auth state...');

                // Get existing session
                const { data: { session } } = await supabase.auth.getSession();
                console.log('Initial session:', session ? 'Found' : 'None');

                setSession(session);
                setUser(session?.user ?? null);
            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                setLoading(false);
            }
        };

        initializeAuth();

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                console.log('Auth state changed:', event);
                setSession(session);
                setUser(session?.user ?? null);
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
            console.log('Attempting to sign in:', email);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('Sign in error:', error.message);
                throw error;
            }

            console.log('Sign in successful');
            return {};
        } catch (error: any) {
            console.error('Error signing in:', error.message);
            return { error: error.message };
        }
    };

    // Sign up with email and password
    const signUp = async (email: string, password: string) => {
        try {
            console.log('Attempting to sign up:', email);
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });

            if (error) throw error;

            // If signUp was successful but confirmation is required
            if (data?.user && !data?.session) {
                console.log('Sign up successful, email confirmation required');
                return { error: 'Please check your email for confirmation link' };
            }

            console.log('Sign up and auto-sign in successful');
            return {};
        } catch (error: any) {
            console.error('Error signing up:', error.message);
            return { error: error.message };
        }
    };

    // Sign out
    const signOut = async () => {
        try {
            console.log('Signing out...');
            await supabase.auth.signOut();
            console.log('Sign out successful');
        } catch (error: any) {
            console.error('Error signing out:', error.message);
            Alert.alert('Error', 'There was a problem signing out.');
        }
    };

    // Reset password
    const resetPassword = async (email: string) => {
        try {
            console.log('Requesting password reset for:', email);
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) throw error;
            console.log('Password reset email sent');
            return {};
        } catch (error: any) {
            console.error('Error resetting password:', error.message);
            return { error: error.message };
        }
    };

    // Update user profile
    const updateUser = async (updates: { name?: string; avatar_url?: string }) => {
        try {
            if (!user) {
                throw new Error('No authenticated user');
            }

            console.log('Updating user profile:', updates);
            const { error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', user?.id);

            if (error) throw error;
            console.log('User profile updated successfully');
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