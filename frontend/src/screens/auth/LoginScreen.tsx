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
import { COLORS, SPACING, FONTS, Typography, CommonStyles } from '../../utils/styles';

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
            style={CommonStyles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <Animated.View
                    style={[
                        styles.contentContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: moveAnim }]
                        }
                    ]}
                >
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('../../../assets/adaptive-icon.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>ADHD Assistant</Text>
                        <Text style={styles.subtitle}>Stay focused, get things done</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <View style={styles.inputContainer}>
                            <Text style={Typography.label}>Email</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="mail-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    returnKeyType="next"
                                    autoComplete="email"
                                    textContentType="emailAddress"
                                />
                                {email.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => setEmail('')}
                                        style={styles.clearButton}
                                    >
                                        <Ionicons name="close-circle" size={18} color={COLORS.gray} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={Typography.label}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your password"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    returnKeyType="done"
                                    onSubmitEditing={handleLogin}
                                    autoComplete="password"
                                    textContentType="password"
                                />
                                <TouchableOpacity
                                    onPress={() => setShowPassword(!showPassword)}
                                    style={styles.visibilityButton}
                                >
                                    <Ionicons
                                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                                        size={22}
                                        color={COLORS.gray}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.rememberContainer}>
                            <View style={styles.rememberMeRow}>
                                <Switch
                                    value={rememberMe}
                                    onValueChange={setRememberMe}
                                    trackColor={{ false: '#D1D1D6', true: COLORS.primaryLight }}
                                    thumbColor={rememberMe ? COLORS.primary : '#F4F4F4'}
                                />
                                <Text style={styles.rememberMeText}>Remember me</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.forgotPasswordContainer}
                                onPress={() => navigation.navigate('ForgotPassword')}
                            >
                                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <>
                                    <Ionicons name="log-in-outline" size={20} color={COLORS.white} style={{marginRight: 8}} />
                                    <Text style={styles.loginButtonText}>Login</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.signupContainer}>
                            <Text style={styles.signupText}>Don't have an account? </Text>
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Signup')}
                                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                            >
                                <Text style={styles.signupLink}>Sign Up</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: SPACING.md,
        minHeight: 500,
    },
    contentContainer: {
        width: '100%',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
        width: '100%',
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: FONTS.size.xxxl,
        fontWeight: FONTS.weight.bold,
        color: COLORS.primary,
        marginBottom: SPACING.xs,
    },
    subtitle: {
        fontSize: FONTS.size.md,
        color: COLORS.gray,
        textAlign: 'center',
        marginHorizontal: SPACING.md,
        maxWidth: '100%'
    },
    formContainer: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: SPACING.md,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        overflow: 'hidden',
    },
    inputIcon: {
        paddingHorizontal: SPACING.sm,
    },
    input: {
        flex: 1,
        padding: SPACING.sm,
        fontSize: FONTS.size.md,
        color: COLORS.dark,
    },
    clearButton: {
        padding: SPACING.xs,
    },
    visibilityButton: {
        padding: SPACING.xs,
    },
    rememberContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    rememberMeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rememberMeText: {
        marginLeft: SPACING.xs,
        fontSize: FONTS.size.sm,
        color: COLORS.gray,
    },
    forgotPasswordContainer: {
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.xs,
    },
    forgotPasswordText: {
        color: COLORS.primary,
        fontSize: FONTS.size.sm,
        fontWeight: FONTS.weight.medium,
    },
    loginButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        padding: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.sm,
    },
    loginButtonText: {
        color: COLORS.white,
        fontSize: FONTS.size.md,
        fontWeight: FONTS.weight.semiBold,
    },
    quickLoginButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.success,
        borderRadius: 8,
        padding: SPACING.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.md,
    },
    quickLoginText: {
        color: COLORS.white,
        fontSize: FONTS.size.sm,
        fontWeight: FONTS.weight.semiBold,
    },
    signupContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: SPACING.xs,
    },
    signupText: {
        color: COLORS.gray,
        fontSize: FONTS.size.sm,
    },
    signupLink: {
        color: COLORS.primary,
        fontSize: FONTS.size.sm,
        fontWeight: FONTS.weight.semiBold,
    },
});

export default LoginScreen;