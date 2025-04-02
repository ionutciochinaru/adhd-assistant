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
} from 'react-native';
import {useAuth} from '../../context/AuthContext';
import {useTaskNotifications} from '../../hooks/useTaskNotifications';
import * as Notifications from 'expo-notifications';
import {supabase} from '../../utils/supabase';
import ScreenLayout from "../../components/ScreenLayout";
import ActionButtons from "../../components/ActionButtons";

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

    // Load user profile data on mount
    useEffect(() => {
        if (user) {
            loadUserData();
            checkNotificationPermissions();
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

    return (
        <ScreenLayout>
            <ScrollView style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.profileImageContainer}>
                        <Image
                            source={require('../../../assets/adaptive-icon.png')}
                            style={styles.profileImage}
                        />
                        <TouchableOpacity style={styles.editImageButton}>
                            <Text style={styles.editImageText}>Edit</Text>
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
                                    <Text style={styles.editNameText}>Edit</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <Text style={styles.email}>{user?.email}</Text>
                    </View>
                </View>

                {!notificationPermission && (
                    <View style={styles.notificationPermissionContainer}>
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
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notification Preferences</Text>

                    {loadingPreferences ? (
                        <ActivityIndicator style={{margin: 20}} size="small" color="#3498db"/>
                    ) : (
                        <>
                            <View style={styles.preferenceItem}>
                                <Text style={styles.preferenceText}>Task Reminders</Text>
                                <Switch
                                    value={notifications.taskReminders}
                                    onValueChange={(value) => toggleNotificationSetting('taskReminders', value)}
                                    trackColor={{false: '#D1D1D6', true: '#BFE9FF'}}
                                    thumbColor={notifications.taskReminders ? '#3498db' : '#F4F4F4'}
                                    disabled={!notificationPermission || loadingPreferences}
                                />
                            </View>

                            <View style={styles.preferenceItem}>
                                <Text style={styles.preferenceText}>Daily Task Digest</Text>
                                <Switch
                                    value={notifications.dailyDigest}
                                    onValueChange={(value) => toggleNotificationSetting('dailyDigest', value)}
                                    trackColor={{false: '#D1D1D6', true: '#BFE9FF'}}
                                    thumbColor={notifications.dailyDigest ? '#3498db' : '#F4F4F4'}
                                    disabled={!notificationPermission || loadingPreferences}
                                />
                            </View>

                            <View style={styles.preferenceItem}>
                                <Text style={styles.preferenceText}>Weekly Progress Report</Text>
                                <Switch
                                    value={notifications.weeklyReport}
                                    onValueChange={(value) => toggleNotificationSetting('weeklyReport', value)}
                                    trackColor={{false: '#D1D1D6', true: '#BFE9FF'}}
                                    thumbColor={notifications.weeklyReport ? '#3498db' : '#F4F4F4'}
                                    disabled={!notificationPermission || loadingPreferences}
                                />
                            </View>

                            <View style={styles.preferenceItem}>
                                <Text style={styles.preferenceText}>Medication Reminders</Text>
                                <Switch
                                    value={notifications.medicationReminders}
                                    onValueChange={(value) => toggleNotificationSetting('medicationReminders', value)}
                                    trackColor={{false: '#D1D1D6', true: '#BFE9FF'}}
                                    thumbColor={notifications.medicationReminders ? '#3498db' : '#F4F4F4'}
                                    disabled={!notificationPermission || loadingPreferences}
                                />
                            </View>
                        </>
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuItemText}>Change Password</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuItemText}>Data & Privacy</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuItemText}>Help & Support</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem}>
                        <Text style={styles.menuItemText}>About</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={handleSignOut}
                >
                    <Text style={styles.signOutButtonText}>Sign Out</Text>
                </TouchableOpacity>

                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>Version 1.0.0</Text>
                </View>
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9FC',
    },
    header: {
        padding: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileImageContainer: {
        position: 'relative',
        marginRight: 20,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    editImageButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#3498db',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    editImageText: {
        color: '#FFFFFF',
        fontSize: 12,
    },
    profileInfo: {
        flex: 1,
    },
    nameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        marginRight: 8,
    },
    editNameButton: {
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    editNameText: {
        color: '#666',
        fontSize: 12,
    },
    email: {
        fontSize: 14,
        color: '#666',
    },
    editNameContainer: {
        marginBottom: 8,
    },
    nameInput: {
        borderWidth: 1,
        borderColor: '#DDE3ED',
        borderRadius: 6,
        padding: 8,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
        marginBottom: 8,
    },
    editButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    editButton: {
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginLeft: 8,
    },
    cancelButton: {
        backgroundColor: '#F0F0F0',
    },
    cancelButtonText: {
        color: '#666',
    },
    saveButton: {
        backgroundColor: '#3498db',
    },
    saveButtonText: {
        color: '#FFFFFF',
    },
    notificationPermissionContainer: {
        backgroundColor: '#f8d7da',
        margin: 16,
        padding: 16,
        borderRadius: 8,
    },
    notificationPermissionText: {
        fontSize: 14,
        color: '#721c24',
        marginBottom: 8,
    },
    notificationPermissionButton: {
        backgroundColor: '#3498db',
        padding: 10,
        borderRadius: 4,
        alignItems: 'center',
    },
    notificationPermissionButtonText: {
        color: '#ffffff',
        fontWeight: '600',
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        marginHorizontal: 16,
        marginTop: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: '#333',
    },
    preferenceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    preferenceText: {
        fontSize: 16,
        color: '#333',
    },
    menuItem: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    menuItemText: {
        fontSize: 16,
        color: '#333',
    },
    signOutButton: {
        backgroundColor: '#FF3B30',
        marginHorizontal: 16,
        marginTop: 20,
        marginBottom: 10,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    signOutButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    versionContainer: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 10,
    },
    versionText: {
        color: '#999',
        fontSize: 14,
    },
});

export default ProfileScreen