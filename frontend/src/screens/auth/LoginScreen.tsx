import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Image,
    Keyboard,
    Animated,
    Vibration,
    Switch,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { COLORS, SPACING, Typography, CommonStyles } from '../../utils/styles';

// Define navigation param list type
type AuthStackParamList = {
    Login: undefined;
    Signup: undefined;
    ForgotPassword: undefined;
};

type Props = StackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [initialLoad, setInitialLoad] = useState(true);
    const { signIn } = useAuth();

    // Animation values
    const fadeAnim = useState(new Animated.Value(0))[0];
    const moveAnim = useState(new Animated.Value(50))[0];

    // Load saved credentials if available
    useEffect(() => {
        const loadSavedCredentials = async () => {
            try {
                const savedRememberMe = await SecureStore.getItemAsync('rememberMe');

                if (savedRememberMe === 'true') {
                    const savedEmail = await SecureStore.getItemAsync('email');
                    const savedPassword = await SecureStore.getItemAsync('password');

                    if (savedEmail) setEmail(savedEmail);
                    if (savedPassword) setPassword(savedPassword);
                    setRememberMe(true);

                    console.log('Restored saved credentials for:', savedEmail);
                } else {
                    console.log('No saved credentials found or remember me disabled');
                }
            } catch (error) {
                console.error('Error loading saved credentials:', error);
            } finally {
                setInitialLoad(false);

                // Start entrance animations
                Animated.parallel([
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(moveAnim, {
                        toValue: 0,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ]).start();
            }
        };

        loadSavedCredentials();
    }, []);

    // Save credentials if remember me is enabled
    const saveCredentials = async () => {
        try {
            if (rememberMe) {
                await SecureStore.setItemAsync('email', email);
                await SecureStore.setItemAsync('password', password);
                await SecureStore.setItemAsync('rememberMe', 'true');
            } else {
                await SecureStore.deleteItemAsync('email');
                await SecureStore.deleteItemAsync('password');
                await SecureStore.setItemAsync('rememberMe', 'false');
            }
        } catch (error) {
            console.error('Error saving credentials:', error);
        }
    };

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter both email and password');
            Vibration.vibrate(200); // Provide tactile feedback for error
            return;
        }

        Keyboard.dismiss();
        setLoading(true);

        try {
            const { error } = await signIn(email, password);

            if (error) {
                Alert.alert('Error', error);
                Vibration.vibrate([0, 200, 100, 200]); // Pattern vibration for error
            } else {
                // Save credentials if remember me is enabled
                await saveCredentials();
            }
        } catch (err) {
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../../../assets/adaptive-icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.title}>Login</Text>
                    <Text style={styles.subtitle}>Welcome back to ADHD Assistant</Text>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons
                            name="mail-outline"
                            size={20}
                            style={styles.inputIcon}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            placeholderTextColor={COLORS.textTertiary}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>
                </View>

                <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons
                            name="lock-closed-outline"
                            size={20}
                            style={styles.inputIcon}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your password"
                            placeholderTextColor={COLORS.textTertiary}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons
                                name={showPassword ? "eye-off-outline" : "eye-outline"}
                                size={20}
                                style={styles.inputIcon}
                            />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.rememberContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Switch
                            value={rememberMe}
                            onValueChange={setRememberMe}
                            trackColor={{
                                false: COLORS.border,
                                true: COLORS.primaryLight
                            }}
                            thumbColor={rememberMe ? COLORS.primary : COLORS.textTertiary}
                        />
                        <Text style={styles.rememberText}>Remember me</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('ForgotPassword')}
                    >
                        <Text style={styles.signupLink}>Forgot Password?</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.loginButton}
                    onPress={handleLogin}
                >
                    <Text style={styles.loginButtonText}>
                        {loading ? <ActivityIndicator color={COLORS.white} /> : 'Login'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.signupContainer}>
                    <Text style={styles.signupText}>Don't have an account?</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                        <Text style={styles.signupLink}>Sign Up</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        ...CommonStyles.container,
        justifyContent: 'center',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: SPACING.md,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: SPACING.md,
        tintColor: COLORS.primary,
    },
    title: {
        ...Typography.h2,
        marginBottom: SPACING.sm,
        textAlign: 'center',
    },
    subtitle: {
        ...Typography.bodyMedium,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.lg,
    },
    inputContainer: {
        marginBottom: SPACING.md,
    },
    label: {
        ...Typography.label,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        ...CommonStyles.input,
    },
    input: {
        flex: 1,
        ...Typography.bodyMedium,
    },
    inputIcon: {
        color: COLORS.textSecondary,
        marginRight: SPACING.sm,
    },
    rememberContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    rememberText: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
    },
    loginButton: {
        ...CommonStyles.buttonLarge,
        marginBottom: SPACING.md,
    },
    loginButtonText: {
        ...Typography.bodyMedium,
        color: COLORS.white,
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    signupText: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
    },
    signupLink: {
        ...Typography.bodySmall,
        color: COLORS.primary,
        marginLeft: SPACING.xs,
    },
});

export default LoginScreen;