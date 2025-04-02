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
import ActionButtons from "../../components/ActionButtons";

// Define navigation param list type
type AuthStackParamList = {
    Login: undefined;
    Signup: undefined;
    ForgotPassword: undefined;
};

type Props = StackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen = ({ navigation }: Props) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const { resetPassword } = useAuth();

    const handleResetPassword = async () => {
        if (!email) {
            Alert.alert('Error', 'Please enter your email address');
            return;
        }

        setLoading(true);
        const { error } = await resetPassword(email);
        setLoading(false);

        if (error) {
            Alert.alert('Error', error);
        } else {
            setIsSubmitted(true);
        }
    };

    if (isSubmitted) {
        return (
            <View style={styles.container}>
                <View style={styles.successContainer}>
                    <Image
                        source={require('../../../assets/adaptive-icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={styles.successTitle}>Email Sent!</Text>
                    <Text style={styles.successText}>
                        We've sent password reset instructions to {email}. Please check your inbox.
                    </Text>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.backButtonText}>Back to Login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

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
                    <Text style={styles.title}>Reset Password</Text>
                    <Text style={styles.subtitle}>Enter your email to receive reset instructions</Text>
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
                            returnKeyType="done"
                            onSubmitEditing={handleResetPassword}
                        />
                    </View>

                    <ActionButtons
                        onCancel={() => navigation.navigate('Login')}
                        onSave={handleResetPassword}
                        cancelText="Back to Login"
                        saveText="Send Reset Email"
                        loading={loading}
                        disabled={!email.trim()}
                    />
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
        textAlign: 'center',
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
    resetButton: {
        backgroundColor: '#3498db',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
        marginBottom: 20,
    },
    resetButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    backToLoginContainer: {
        alignItems: 'center',
    },
    backToLoginText: {
        color: '#3498db',
        fontSize: 14,
        fontWeight: '600',
    },
    successContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2ecc71',
        marginBottom: 16,
    },
    successText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    backButton: {
        backgroundColor: '#3498db',
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
        width: '100%',
    },
    backButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ForgotPasswordScreen;