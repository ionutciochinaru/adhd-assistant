import React, { useState } from 'react';
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
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useAuth } from '../../context/AuthContext';

// Define navigation param list type
type AuthStackParamList = {
    Login: undefined;
    Signup: undefined;
    ForgotPassword: undefined;
};

type Props = StackScreenProps<AuthStackParamList, 'Signup'>;

const SignupScreen = ({ navigation }: Props) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();

    const handleSignUp = async () => {
        // Validate input
        if (!email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        // Attempt to sign up
        setLoading(true);
        const { error } = await signUp(email, password);
        setLoading(false);

        if (error) {
            Alert.alert('Sign Up Error', error);
        } else {
            Alert.alert(
                'Success!',
                'Your account has been created. Please check your email for verification.',
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
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
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join ADHD Assistant today</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            returnKeyType="next"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Create a password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            returnKeyType="next"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Confirm Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm your password"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry
                            returnKeyType="done"
                            onSubmitEditing={handleSignUp}
                        />
                    </View>

                    <TouchableOpacity
                        style={styles.signupButton}
                        onPress={handleSignUp}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.signupButtonText}>Sign Up</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.loginContainer}>
                        <Text style={styles.loginText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginLink}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9FC',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#3498db',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    formContainer: {
        width: '100%',
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#DDE3ED',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    signupButton: {
        backgroundColor: '#3498db',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
        marginBottom: 20,
    },
    signupButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    loginText: {
        color: '#666',
        fontSize: 14,
    },
    loginLink: {
        color: '#3498db',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default SignupScreen;