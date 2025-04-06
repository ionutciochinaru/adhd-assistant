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
import { COLORS, CommonStyles, SPACING, Typography, RADIUS, SHADOWS } from '../../utils/styles';

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
        successContainer: {
            ...CommonStyles.card,
            alignItems: 'center',
            padding: SPACING.xl,
        },
        logo: {
            width: 100,
            height: 100,
            marginBottom: SPACING.md,
            tintColor: COLORS.primary,
        },
        successTitle: {
            ...Typography.h3,
            color: COLORS.success,
            marginBottom: SPACING.md,
        },
        successText: {
            ...Typography.bodyMedium,
            color: COLORS.textSecondary,
            textAlign: 'center',
            marginBottom: SPACING.lg,
        },
        backButton: {
            ...CommonStyles.buttonLarge,
            backgroundColor: COLORS.primary,
            marginTop: SPACING.md,
        },
        backButtonText: {
            ...Typography.bodyMedium,
            color: COLORS.white,
        },
        inputContainer: {
            marginBottom: SPACING.md,
        },
        label: {
            ...Typography.label,
        },
        input: {
            ...CommonStyles.input,
            marginTop: SPACING.xs,
        },
    });

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
                <View style={{alignItems: 'center', marginBottom: SPACING.xl}}>
                    <Image
                        source={require('../../../assets/adaptive-icon.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                    <Text style={Typography.h2}>Reset Password</Text>
                    <Text style={[Typography.bodyMedium, {color: COLORS.textSecondary, marginTop: SPACING.sm}]}>
                        Enter your email to receive reset instructions
                    </Text>
                </View>

                <View>
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter your email"
                            placeholderTextColor={COLORS.textTertiary}
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

export default ForgotPasswordScreen;