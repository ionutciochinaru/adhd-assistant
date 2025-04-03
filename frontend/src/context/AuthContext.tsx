// frontend/src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
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

    // Keep track of mounted state to prevent state updates after unmount
    const isMounted = useRef(true);

    // Handle session persistence
    useEffect(() => {
        // Better session initialization
        const initializeAuth = async () => {
            try {
                if (!isMounted.current) return;

                setLoading(true);
                console.log('Initializing auth state...');

                // Try to restore session from SecureStore first
                const savedSession = await SecureStore.getItemAsync('supabase_session');
                if (savedSession) {
                    try {
                        const parsedSession = JSON.parse(savedSession);
                        // Set session from storage if it exists and isn't expired
                        const now = new Date();
                        const expiresAt = new Date(parsedSession.expires_at * 1000);

                        if (expiresAt > now) {
                            console.log('Restored session from secure storage');
                            // Update supabase with this session
                            await supabase.auth.setSession({
                                access_token: parsedSession.access_token,
                                refresh_token: parsedSession.refresh_token
                            });
                        } else {
                            console.log('Saved session expired, getting fresh session');
                        }
                    } catch (parseError) {
                        console.error('Error parsing saved session:', parseError);
                    }
                }

                // Get existing session or refresh token
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('Error getting session:', error.message);
                    return;
                }

                console.log('Initial session:', session ? 'Found' : 'None');

                if (session) {
                    // Save the session to SecureStore for persistence
                    await SecureStore.setItemAsync('supabase_session', JSON.stringify({
                        access_token: session.access_token,
                        refresh_token: session.refresh_token,
                        expires_at: Math.floor(new Date(session.expires_at).getTime() / 1000)
                    }));
                }

                if (isMounted.current) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
                setLoading(false);
            }
        };

        initializeAuth();

        // Set up auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, currentSession) => {
                console.log('Auth state changed:', event);

                if (event === 'SIGNED_IN' && currentSession) {
                    // Save session to SecureStore when user signs in
                    await SecureStore.setItemAsync('supabase_session', JSON.stringify({
                        access_token: currentSession.access_token,
                        refresh_token: currentSession.refresh_token,
                        expires_at: Math.floor(new Date(currentSession.expires_at).getTime() / 1000)
                    }));
                } else if (event === 'SIGNED_OUT') {
                    // Remove session from SecureStore when user signs out
                    await SecureStore.deleteItemAsync('supabase_session');
                }

                if (isMounted.current) {
                    setSession(currentSession);
                    setUser(currentSession?.user ?? null);
                }
            }
        );

        // Clean up the subscription and set mounted state to false
        return () => {
            isMounted.current = false;
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

            // Save session to SecureStore when user signs in
            if (data.session) {
                await SecureStore.setItemAsync('supabase_session', JSON.stringify({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    expires_at: Math.floor(new Date(data.session.expires_at).getTime() / 1000)
                }));
            }

            return {};
        } catch (error: any) {
            console.error('Error signing in:', error.message);
            return { error: error.message || 'An unknown error occurred during sign in' };
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

            // Save session to SecureStore if auto-sign in happened
            if (data.session) {
                await SecureStore.setItemAsync('supabase_session', JSON.stringify({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token,
                    expires_at: Math.floor(new Date(data.session.expires_at).getTime() / 1000)
                }));
            }

            return {};
        } catch (error: any) {
            console.error('Error signing up:', error.message);
            return { error: error.message || 'An unknown error occurred during sign up' };
        }
    };

    // Sign out
    const signOut = async () => {
        try {
            console.log('Signing out...');

            // For better UX, immediately clear user state on signOut action
            // This makes logout feel more responsive even if API call is slow
            if (isMounted.current) {
                setUser(null);
                setSession(null);
            }

            // Remove session from SecureStore
            await SecureStore.deleteItemAsync('supabase_session');

            // Also try to clear saved credentials if they exist
            await SecureStore.deleteItemAsync('email');
            await SecureStore.deleteItemAsync('password');
            await SecureStore.setItemAsync('rememberMe', 'false');

            // Call supabase signOut
            await supabase.auth.signOut();
            console.log('Sign out successful');
        } catch (error: any) {
            console.error('Error signing out:', error.message);
            Alert.alert('Error', 'There was a problem signing out. Please try again.');

            // If we've already optimistically cleared the user state, we need to re-check session
            if (isMounted.current) {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
                setUser(session?.user ?? null);
            }
        }
    };

    // Reset password
    const resetPassword = async (email: string) => {
        try {
            console.log('Requesting password reset for:', email);
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'com.yourcompany.adhdassistant://reset-password',
            });

            if (error) throw error;

            console.log('Password reset email sent');
            return {};
        } catch (error: any) {
            console.error('Error resetting password:', error.message);
            return { error: error.message || 'Failed to send password reset email' };
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
                .eq('id', user?.id)
                .single();

            if (error) throw error;

            console.log('User profile updated successfully');
            return {};
        } catch (error: any) {
            console.error('Error updating user:', error.message);
            return { error: error.message || 'Failed to update user profile' };
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