// frontend/src/screens/profile/ProfileScreen.tsx
import React, { useState } from 'react';
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
import { useAuth } from '../../context/AuthContext';

const ProfileScreen = () => {
    const { user, signOut, updateUser } = useAuth();
    const [name, setName] = useState(user?.user_metadata?.name || '');
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    // Notification preferences
    const [notifications, setNotifications] = useState({
        taskReminders: true,
        dailyDigest: true,
        weeklyReport: true,
        medicationReminders: true,
    });

    const handleUpdateProfile = async () => {
        setLoading(true);
        const { error } = await updateUser({ name });
        setLoading(false);

        if (error) {
            Alert.alert('Error', error);
        } else {
            setIsEditing(false);
            Alert.alert('Success', 'Profile updated successfully');
        }
    };

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
            ]
        );
    };

    return (
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
                            <View style={styles.editButtonsRow}>
                                <TouchableOpacity
                                    style={[styles.editButton, styles.cancelButton]}
                                    onPress={() => setIsEditing(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.editButton, styles.saveButton]}
                                    onPress={handleUpdateProfile}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    ) : (
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
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

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notification Preferences</Text>

                <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceText}>Task Reminders</Text>
                    <Switch
                        value={notifications.taskReminders}
                        onValueChange={(value) =>
                            setNotifications({...notifications, taskReminders: value})
                        }
                        trackColor={{ false: '#D1D1D6', true: '#BFE9FF' }}
                        thumbColor={notifications.taskReminders ? '#3498db' : '#F4F4F4'}
                    />
                </View>

                <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceText}>Daily Task Digest</Text>
                    <Switch
                        value={notifications.dailyDigest}
                        onValueChange={(value) =>
                            setNotifications({...notifications, dailyDigest: value})
                        }
                        trackColor={{ false: '#D1D1D6', true: '#BFE9FF' }}
                        thumbColor={notifications.dailyDigest ? '#3498db' : '#F4F4F4'}
                    />
                </View>

                <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceText}>Weekly Progress Report</Text>
                    <Switch
                        value={notifications.weeklyReport}
                        onValueChange={(value) =>
                            setNotifications({...notifications, weeklyReport: value})
                        }
                        trackColor={{ false: '#D1D1D6', true: '#BFE9FF' }}
                        thumbColor={notifications.weeklyReport ? '#3498db' : '#F4F4F4'}
                    />
                </View>

                <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceText}>Medication Reminders</Text>
                    <Switch
                        value={notifications.medicationReminders}
                        onValueChange={(value) =>
                            setNotifications({...notifications, medicationReminders: value})
                        }
                        trackColor={{ false: '#D1D1D6', true: '#BFE9FF' }}
                        thumbColor={notifications.medicationReminders ? '#3498db' : '#F4F4F4'}
                    />
                </View>
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
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        marginHorizontal: 16,
        marginTop: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
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

export default ProfileScreen;