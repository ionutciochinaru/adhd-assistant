// frontend/src/screens/profile/ProfileScreen.tsx
import React, {useEffect, useState} from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Alert,
    Image,
    TextInput,
    ActivityIndicator,
    Animated,
} from 'react-native';
import {useAuth} from '../../context/AuthContext';
import {useTaskNotifications} from '../../hooks/useTaskNotifications';
import * as Notifications from 'expo-notifications';
import {supabase} from '../../utils/supabase';
import ScreenLayout from "../../components/ScreenLayout";
import ActionButtons from "../../components/ActionButtons";
import {COLORS, SPACING, RADIUS, Typography, SHADOWS, FONTS, CommonStyles} from "../../utils/styles";
import {Ionicons} from '@expo/vector-icons';

const ProfileScreen = () => {
    const {user, signOut, updateUser} = useAuth();
    const [name, setName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadingPreferences, setLoadingPreferences] = useState(true);
    const {enableDailyDigest, disableDailyDigest, syncTaskNotifications} = useTaskNotifications();
    const [notificationPermission, setNotificationPermission] = useState<boolean>(false);

    // Notification preferences
    const [notifications, setNotifications] = useState({
        taskReminders: true,
        dailyDigest: true,
        weeklyReport: true,
        medicationReminders: true,
    });

    // Animations
    const fadeAnim = useState(new Animated.Value(0))[0];
    const translateYAnim = useState(new Animated.Value(20))[0];

    // Load user profile data on mount
    useEffect(() => {
        if (user) {
            loadUserData();
            checkNotificationPermissions();

            // Start fade-in animation
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true
                }),
                Animated.timing(translateYAnim, {
                    toValue: 0,
                    duration: 600,
                    useNativeDriver: true
                })
            ]).start();
        }
    }, [user]);

    // Load user data including name and notification preferences
    const loadUserData = async () => {
        try {
            setLoadingPreferences(true);

            // Fetch user data from the users table
            const {data, error} = await supabase
                .from('users')
                .select('name, notification_preferences')
                .eq('id', user?.id)
                .maybeSingle(); // Use maybeSingle instead of single to handle no rows case

            if (error && error.code !== 'PGRST116') {
                // Handle errors except for "no rows returned"
                console.error('Error loading user data:', error);
                return;
            }

            // If no user record exists yet, create one
            if (!data) {
                console.log('No user record found, creating one...');

                const defaultPrefs = {
                    taskReminders: true,
                    dailyDigest: false,
                    weeklyReport: false,
                    medicationReminders: false
                };

                const {error: insertError} = await supabase
                    .from('users')
                    .insert({
                        id: user?.id,
                        email: user?.email,
                        name: user?.user_metadata?.name || '',
                        notification_preferences: defaultPrefs
                    });

                if (insertError) {
                    console.error('Error creating user record:', insertError);
                } else {
                    // Set default values
                    setName(user?.user_metadata?.name || '');
                    setNotifications(defaultPrefs);
                }
            } else {
                // User record exists, set the values
                setName(data.name || user?.user_metadata?.name || '');

                if (data.notification_preferences) {
                    const prefs = data.notification_preferences;
                    setNotifications({
                        taskReminders: prefs.taskReminders !== false,
                        dailyDigest: prefs.dailyDigest?.enabled || false,
                        weeklyReport: prefs.weeklyReport !== false,
                        medicationReminders: prefs.medicationReminders !== false,
                    });
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        } finally {
            setLoadingPreferences(false);
        }
    };

    const checkNotificationPermissions = async () => {
        const {status} = await Notifications.getPermissionsAsync();
        setNotificationPermission(status === 'granted');
    };

    const requestNotificationPermissions = async () => {
        const {status} = await Notifications.requestPermissionsAsync();
        setNotificationPermission(status === 'granted');

        if (status === 'granted') {
            Alert.alert('Success', 'Notification permissions granted');
            // Sync all notifications
            await syncTaskNotifications();
        } else {
            Alert.alert('Error', 'Notification permissions denied');
        }
    };

    const toggleNotificationSetting = async (setting: keyof typeof notifications, value: boolean) => {
        try {
            setLoadingPreferences(true);

            // Check if notification permission is granted
            if (!notificationPermission) {
                Alert.alert(
                    'Permission Required',
                    'Notifications need permission to function. Would you like to enable them?',
                    [
                        {text: 'Cancel', style: 'cancel'},
                        {text: 'Enable', onPress: requestNotificationPermissions}
                    ]
                );
                return;
            }

            // Update local state
            const newNotifications = {...notifications, [setting]: value};
            setNotifications(newNotifications);

            // Prepare updated preferences
            let updatedPrefs = {
                taskReminders: newNotifications.taskReminders,
                weeklyReport: newNotifications.weeklyReport,
                medicationReminders: newNotifications.medicationReminders,
                dailyDigest: {
                    enabled: newNotifications.dailyDigest,
                    hour: 8,
                    minute: 0
                }
            };

            // Handle specific notification types
            if (setting === 'dailyDigest') {
                if (value) {
                    await enableDailyDigest(8, 0); // 8:00 AM
                } else {
                    await disableDailyDigest();
                }
            } else if (setting === 'taskReminders' && value) {
                // Re-sync all task notifications if enabling
                await syncTaskNotifications();
            }

            // Save updated preferences to database
            const {error: updateError} = await supabase
                .from('users')
                .update({
                    notification_preferences: updatedPrefs
                })
                .eq('id', user?.id);

            if (updateError) {
                console.error('Error updating preferences:', updateError);
                throw updateError;
            }

        } catch (error) {
            console.error('Error updating notification preferences:', error);
            Alert.alert('Error', 'Failed to update notification preferences');

            // Revert the local state change on error
            setNotifications(prev => ({...prev, [setting]: !value}));
        } finally {
            setLoadingPreferences(false);
        }
    };

    const handleUpdateProfile = async () => {
        setLoading(true);
        try {
            // Update both user_metadata (auth) and users table (database)
            const {error: updateError} = await supabase
                .from('users')
                .update({name})
                .eq('id', user?.id);

            if (updateError) throw updateError;

            // Also update the user metadata via auth if available
            const {error} = await updateUser({name});

            if (error) throw new Error(error);

            setIsEditing(false);
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error) {
            console.error('Error updating profile:', error);
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Sign Out', style: 'destructive', onPress: () => signOut()},
            ]
        );
    };

    // Render a single preference toggle item
    const renderPreferenceItem = (
        title: string,
        description: string,
        setting: keyof typeof notifications,
        icon: string
    ) => (
        <View style={styles.preferenceItem}>
            <View style={styles.preferenceIconContainer}>
                <Ionicons name={icon as any} size={24} color={COLORS.primary} />
            </View>
            <View style={styles.preferenceContent}>
                <Text style={styles.preferenceTitle}>{title}</Text>
                <Text style={styles.preferenceDescription}>{description}</Text>
            </View>
            <Switch
                value={notifications[setting]}
                onValueChange={(value) => toggleNotificationSetting(setting, value)}
                trackColor={{false: COLORS.cardShadow, true: COLORS.primaryLight}}
                thumbColor={notifications[setting] ? COLORS.primary : COLORS.border}
                disabled={!notificationPermission || loadingPreferences}
                style={styles.preferenceSwitch}
            />
        </View>
    );

    const renderMenuItem = (title: string, icon: string, onPress: () => void) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuIconContainer}>
                <Ionicons name={icon as any} size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.menuItemText}>{title}</Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
        </TouchableOpacity>
    );

    return (
        <ScreenLayout
            title="Profile"
            backgroundColor={COLORS.background}
            showHeader={false}
        >
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: translateYAnim }]
                    }
                ]}>
                    <View style={styles.header}>
                        <View style={styles.profileImageContainer}>
                            <Image
                                source={require('../../../assets/adaptive-icon.png')}
                                style={styles.profileImage}
                            />
                            <TouchableOpacity style={styles.editImageButton}>
                                <Ionicons name="camera" size={14} color={COLORS.white} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.profileInfo}>
                            {isEditing ? (
                                <View style={styles.editNameContainer}>
                                    <TextInput
                                        style={styles.nameInput}
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="Enter your name"
                                        placeholderTextColor={COLORS.textTertiary}
                                    />
                                    <ActionButtons
                                        onCancel={() => setIsEditing(false)}
                                        onSave={handleUpdateProfile}
                                        loading={loading}
                                    />
                                </View>
                            ) : (
                                <View style={styles.nameContainer}>
                                    <Text style={styles.name}>{name || 'Add your name'}</Text>
                                    <TouchableOpacity
                                        style={styles.editNameButton}
                                        onPress={() => setIsEditing(true)}
                                    >
                                        <Ionicons name="pencil" size={16} color={COLORS.white} />
                                    </TouchableOpacity>
                                </View>
                            )}
                            <Text style={styles.email}>{user?.email}</Text>
                        </View>
                    </View>

                    {!notificationPermission && (
                        <View style={styles.notificationPermissionContainer}>
                            <Ionicons name="notifications-off" size={24} color={COLORS.danger} style={styles.notificationIcon} />
                            <View style={styles.notificationTextContainer}>
                                <Text style={styles.notificationPermissionText}>
                                    Notifications are disabled. Enable them to get reminders for your tasks.
                                </Text>
                                <TouchableOpacity
                                    style={styles.notificationPermissionButton}
                                    onPress={requestNotificationPermissions}
                                >
                                    <Text style={styles.notificationPermissionButtonText}>
                                        Enable Notifications
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Notification Preferences</Text>

                        {loadingPreferences ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                                <Text style={styles.loadingText}>Loading preferences...</Text>
                            </View>
                        ) : (
                            <View style={styles.preferencesContainer}>
                                {renderPreferenceItem(
                                    'Task Reminders',
                                    'Receive notifications for upcoming tasks and deadlines',
                                    'taskReminders',
                                    'checkmark-circle'
                                )}

                                {renderPreferenceItem(
                                    'Daily Task Digest',
                                    'Get a daily summary of your tasks at 8:00 AM',
                                    'dailyDigest',
                                    'calendar'
                                )}

                                {renderPreferenceItem(
                                    'Weekly Progress Report',
                                    'Receive a summary of your completed tasks each week',
                                    'weeklyReport',
                                    'bar-chart'
                                )}

                                {renderPreferenceItem(
                                    'Medication Reminders',
                                    'Get reminders for taking your medications',
                                    'medicationReminders',
                                    'medical'
                                )}
                            </View>
                        )}
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Account Settings</Text>

                        <View style={styles.menuContainer}>
                            {renderMenuItem('Change Password', 'lock-closed', () => {
                                Alert.alert('Coming Soon', 'This feature will be available soon!');
                            })}

                            {renderMenuItem('Data & Privacy', 'shield-checkmark', () => {
                                Alert.alert('Coming Soon', 'This feature will be available soon!');
                            })}

                            {renderMenuItem('Help & Support', 'help-circle', () => {
                                Alert.alert('Coming Soon', 'This feature will be available soon!');
                            })}

                            {renderMenuItem('About', 'information-circle', () => {
                                Alert.alert('Coming Soon', 'This feature will be available soon!');
                            })}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.signOutButton}
                        onPress={handleSignOut}
                    >
                        <Ionicons name="exit-outline" size={20} color={COLORS.white} style={styles.signOutIcon} />
                        <Text style={styles.signOutButtonText}>Sign Out</Text>
                    </TouchableOpacity>

                    <View style={styles.versionContainer}>
                        <Text style={styles.versionText}>Version 1.0.0</Text>
                    </View>
                </Animated.View>
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        flex: 1,
        marginBottom: SPACING.bottomNavBar,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.lg,
        margin: SPACING.md,
        ...SHADOWS.medium,
    },
    profileImageContainer: {
        position: 'relative',
        marginRight: SPACING.md,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: COLORS.primary,
    },
    editImageButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    profileInfo: {
        flex: 1,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    name: {
        ...Typography.h3,
        color: COLORS.textPrimary,
        marginRight: SPACING.sm,
    },
    editNameButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    email: {
        ...Typography.bodyMedium,
        color: COLORS.textSecondary,
    },
    editNameContainer: {
        marginBottom: SPACING.sm,
    },
    nameInput: {
        ...CommonStyles.input,
        marginBottom: SPACING.sm,
        backgroundColor: COLORS.inputBackground,
        color: COLORS.textPrimary,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginTop: 0,
    },
    notificationPermissionContainer: {
        backgroundColor: COLORS.cardRed,
        margin: SPACING.md,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.danger,
        flexDirection: 'row',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    notificationIcon: {
        marginRight: SPACING.sm,
    },
    notificationTextContainer: {
        flex: 1,
    },
    notificationPermissionText: {
        ...Typography.bodySmall,
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm,
    },
    notificationPermissionButton: {
        backgroundColor: COLORS.danger,
        padding: SPACING.sm,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        ...SHADOWS.small,
    },
    notificationPermissionButtonText: {
        ...Typography.bodyMedium,
        color: COLORS.white,
        fontWeight: FONTS.weight.semiBold,
    },
    section: {
        margin: SPACING.md,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        overflow: 'hidden',
        ...SHADOWS.medium,
    },
    sectionTitle: {
        ...Typography.h4,
        color: COLORS.textPrimary,
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    loadingContainer: {
        padding: SPACING.xl,
        alignItems: 'center',
    },
    loadingText: {
        ...Typography.bodyMedium,
        color: COLORS.textSecondary,
        marginTop: SPACING.sm,
    },
    preferencesContainer: {
        paddingTop: SPACING.sm,
    },
    preferenceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    preferenceIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.cardBlue,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    preferenceContent: {
        flex: 1,
    },
    preferenceTitle: {
        ...Typography.bodyMedium,
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    preferenceDescription: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
    },
    preferenceSwitch: {
        marginLeft: SPACING.md,
    },
    menuContainer: {
        paddingTop: SPACING.xs,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.cardBlue,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    menuItemText: {
        ...Typography.bodyMedium,
        color: COLORS.textPrimary,
        flex: 1,
    },
    signOutButton: {
        backgroundColor: COLORS.danger,
        margin: SPACING.md,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        ...SHADOWS.medium,
    },
    signOutIcon: {
        marginRight: SPACING.sm,
    },
    signOutButtonText: {
        ...Typography.bodyMedium,
        color: COLORS.white,
        fontWeight: FONTS.weight.semiBold,
    },
    versionContainer: {
        alignItems: 'center',
        marginTop: SPACING.md,
        marginBottom: SPACING.xl,
    },
    versionText: {
        ...Typography.bodySmall,
        color: COLORS.textTertiary,
    },
});

export default ProfileScreen;