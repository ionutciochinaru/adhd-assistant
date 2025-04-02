// frontend/src/services/NotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Task } from '../utils/supabase';

// Configure notifications with more robust handling
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

/**
 * Request notification permissions and register for push notifications
 * @returns Push notification token or undefined if not available
 */
export async function registerForPushNotificationsAsync() {
    try {
        let token;

        // Setup notification channels for Android
        if (Platform.OS === 'android') {
            await setupAndroidNotificationChannels();
        }

        // Only proceed with push token on physical devices
        if (!Device.isDevice) {
            console.log('Push notifications require a physical device');
            return undefined;
        }

        // Check existing permissions
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        // Request permissions if not already granted
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for notifications!');
            return undefined;
        }

        // Get project ID from various sources with explicit null checks and fallbacks
        const projectId = getProjectId();

        // Try to get token with proper error handling
        return await getPushToken(projectId);
    } catch (error) {
        console.error('Error setting up notifications:', error);
        return undefined;
    }
}

/**
 * Set up Android notification channels with proper error handling
 */
async function setupAndroidNotificationChannels() {
    try {
        // Create default channel
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3498DB',
        });

        // Create a specific channel for task reminders
        await Notifications.setNotificationChannelAsync('task-reminders', {
            name: 'Task Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3498DB',
            description: 'Notifications for task due dates and reminders',
        });

        // Create a specific channel for medication reminders
        await Notifications.setNotificationChannelAsync('medication-reminders', {
            name: 'Medication Reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#27AE60',
            description: 'Notifications for medication reminders',
        });

        // Create a specific channel for journals and mood tracking
        await Notifications.setNotificationChannelAsync('mood-journal', {
            name: 'Mood Journal',
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#9B59B6',
            description: 'Reminders for mood journaling',
        });

        console.log('Successfully set up Android notification channels');
    } catch (error) {
        console.error('Error setting up Android notification channels:', error);
        // Create at least the default channel as fallback
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.HIGH,
        });
    }
}

/**
 * Get project ID from various sources with proper fallbacks
 */
function getProjectId(): string {
    // Try to get the project ID from Constants with null checks
    const expoConfig = Constants?.expoConfig;
    const easConfig = Constants?.easConfig;
    const configProjectId = expoConfig?.extra?.eas?.projectId;
    const easProjectId = easConfig?.projectId;
    const envProjectId = process.env.EXPO_PUBLIC_PROJECT_ID;

    // Use first available value with proper fallback
    return configProjectId || easProjectId || envProjectId || 'your-project-id';
}

/**
 * Get push token with error handling and fallbacks
 */
async function getPushToken(projectId: string): Promise<string | undefined> {
    try {
        let token;

        // Try to get Expo push token first
        try {
            token = (await Notifications.getExpoPushTokenAsync({
                projectId,
            })).data;
            console.log('Successfully got Expo push token');
        } catch (expoPushError) {
            console.log('Expo push token error:', expoPushError);
            console.log('Falling back to device push token');

            // Fallback to device push token
            token = (await Notifications.getDevicePushTokenAsync()).data;
            console.log('Successfully got device push token');
        }

        return token;
    } catch (error) {
        console.error('Error getting push token:', error);
        return undefined;
    }
}

/**
 * Schedule a task reminder notification
 * @param task The task to create a reminder for
 * @returns Notification ID if scheduled, null otherwise
 */
export async function scheduleTaskReminder(task: Task) {
    if (!task.due_date) return null;

    try {
        // Cancel any existing notifications for this task first to avoid duplicates
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

        for (const notification of scheduledNotifications) {
            if (notification.content.data?.taskId === task.id) {
                await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            }
        }

        // Calculate notification time (1 hour before due date)
        const dueDate = new Date(task.due_date);
        const notificationDate = new Date(dueDate.getTime() - 60 * 60 * 1000); // 1 hour before

        // Don't schedule notifications for past dates
        if (notificationDate <= new Date()) {
            console.log(`Task "${task.title}" due date is in the past, not scheduling notification`);
            return null;
        }

        // Schedule notification with appropriate channel for Android
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Task Reminder',
                body: `"${task.title}" is due in 1 hour`,
                data: { taskId: task.id, type: 'task-reminder' },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.HIGH,
                ...(Platform.OS === 'android' ? { channelId: 'task-reminders' } : {}),
            },
            trigger: {
                date: notificationDate,
            },
        });

        console.log(`Scheduled notification for task "${task.title}" with ID:`, notificationId);
        return notificationId;
    } catch (error) {
        console.error('Error scheduling task notification:', error);
        return null;
    }
}

/**
 * Cancel a scheduled notification
 * @param notificationId ID of the notification to cancel
 * @returns true if successful, false otherwise
 */
export async function cancelTaskReminder(notificationId: string) {
    try {
        // Verify the notification exists before trying to cancel
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const notificationExists = scheduledNotifications.some(
            notification => notification.identifier === notificationId
        );

        if (!notificationExists) {
            console.log(`Notification with ID ${notificationId} not found, nothing to cancel`);
            return true;
        }

        await Notifications.cancelScheduledNotificationAsync(notificationId);
        console.log(`Canceled notification with ID: ${notificationId}`);
        return true;
    } catch (error) {
        console.error('Error canceling notification:', error);
        return false;
    }
}

/**
 * Schedule a daily task digest notification
 * @param hour Hour to schedule the notification (0-23)
 * @param minute Minute to schedule the notification (0-59)
 * @returns Notification ID if scheduled, null otherwise
 */
export async function scheduleDailyDigest(hour: number = 8, minute: number = 0) {
    try {
        // Cancel any existing daily digests first
        await cancelNotificationsByType('dailyDigest');

        // Schedule the notification with a daily repeating trigger
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Daily Task Digest',
                body: 'Check your tasks for today',
                data: { type: 'dailyDigest' },
                ...(Platform.OS === 'android' ? { channelId: 'task-reminders' } : {}),
            },
            trigger: {
                hour,
                minute,
                repeats: true,
            },
        });

        console.log(`Scheduled daily digest at ${hour}:${minute}, ID: ${notificationId}`);
        return notificationId;
    } catch (error) {
        console.error('Error scheduling daily digest:', error);
        return null;
    }
}

/**
 * Helper to cancel notifications by type
 * @param type The notification type to cancel
 * @returns true if successful, false otherwise
 */
async function cancelNotificationsByType(type: string) {
    try {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

        for (const notification of scheduledNotifications) {
            if (notification.content.data?.type === type) {
                await Notifications.cancelScheduledNotificationAsync(notification.identifier);
                console.log(`Canceled ${type} notification: ${notification.identifier}`);
            }
        }

        return true;
    } catch (error) {
        console.error(`Error canceling ${type} notifications:`, error);
        return false;
    }
}

/**
 * Schedule a medication reminder
 * @param medicationName Name of the medication
 * @param hour Hour to schedule the notification (0-23)
 * @param minute Minute to schedule the notification (0-59)
 * @param daysOfWeek Days of the week to schedule (1-7, where 1 is Monday)
 * @returns Array of notification IDs if scheduled, null otherwise
 */
export async function scheduleMedicationReminder(
    medicationName: string,
    hour: number,
    minute: number,
    daysOfWeek: number[] = [1, 2, 3, 4, 5, 6, 7] // All days by default
) {
    try {
        const notificationIds: string[] = [];

        // Cancel any existing reminders for this medication first
        await cancelNotificationsByData({ medicationName });

        // Schedule a notification for each day of the week
        for (const day of daysOfWeek) {
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Medication Reminder',
                    body: `Time to take your ${medicationName}`,
                    data: { type: 'medication', name: medicationName },
                    sound: true,
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                    ...(Platform.OS === 'android' ? { channelId: 'medication-reminders' } : {}),
                },
                trigger: {
                    hour,
                    minute,
                    weekday: day,
                    repeats: true,
                },
            });

            notificationIds.push(notificationId);
            console.log(`Scheduled medication reminder for ${medicationName} on day ${day} at ${hour}:${minute}`);
        }

        return notificationIds;
    } catch (error) {
        console.error('Error scheduling medication reminder:', error);
        return null;
    }
}

/**
 * Helper to cancel notifications by any data property
 * @param data Object containing data properties to match
 * @returns true if successful, false otherwise
 */
async function cancelNotificationsByData(data: Record<string, any>) {
    try {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

        for (const notification of scheduledNotifications) {
            let match = true;

            // Check if all properties in data match the notification's data
            for (const [key, value] of Object.entries(data)) {
                if (notification.content.data?.[key] !== value) {
                    match = false;
                    break;
                }
            }

            if (match) {
                await Notifications.cancelScheduledNotificationAsync(notification.identifier);
                console.log(`Canceled notification matching data:`, data);
            }
        }

        return true;
    } catch (error) {
        console.error('Error canceling notifications by data:', error);
        return false;
    }
}

/**
 * Show an immediate notification
 * @param title Notification title
 * @param body Notification body
 * @param data Optional data to include
 * @returns Notification ID if scheduled, null otherwise
 */
export async function showNotification(title: string, body: string, data: any = {}) {
    try {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
            },
            trigger: null, // Show immediately
        });

        console.log(`Showed immediate notification: ${title}`);
        return notificationId;
    } catch (error) {
        console.error('Error showing notification:', error);
        return null;
    }
}

/**
 * Schedule a notification after a time interval
 * @param title Notification title
 * @param body Notification body
 * @param seconds Seconds to wait before showing
 * @param data Optional data to include
 * @returns Notification ID if scheduled, null otherwise
 */
export async function scheduleNotificationAfterInterval(
    title: string,
    body: string,
    seconds: number,
    data: any = {},
    channelId: string = 'default'
) {
    try {
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
                ...(Platform.OS === 'android' ? { channelId } : {}),
            },
            trigger: {
                seconds,
            },
        });

        console.log(`Scheduled notification after ${seconds} seconds: ${title}`);
        return notificationId;
    } catch (error) {
        console.error('Error scheduling interval notification:', error);
        return null;
    }
}

/**
 * Get all scheduled notifications
 * @returns Array of scheduled notifications
 */
export async function getAllScheduledNotifications() {
    try {
        return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
        console.error('Error getting scheduled notifications:', error);
        return [];
    }
}

/**
 * Cancel all scheduled notifications
 * @returns true if successful, false otherwise
 */
export async function cancelAllNotifications() {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        console.log('Canceled all scheduled notifications');
        return true;
    } catch (error) {
        console.error('Error canceling all notifications:', error);
        return false;
    }
}

/**
 * Set up notification listeners
 * @param onNotificationReceived Callback for when a notification is received
 * @param onNotificationResponse Callback for when a user responds to a notification
 * @returns Cleanup function to remove listeners
 */
export function setupNotificationListeners(
    onNotificationReceived: (notification: Notifications.Notification) => void,
    onNotificationResponse: (response: Notifications.NotificationResponse) => void
) {
    const notificationListener = Notifications.addNotificationReceivedListener(onNotificationReceived);
    const responseListener = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

    // Return a cleanup function to remove the listeners
    return () => {
        Notifications.removeNotificationSubscription(notificationListener);
        Notifications.removeNotificationSubscription(responseListener);
    };
}

/**
 * Schedule a weekly mood check-in notification
 * @param dayOfWeek Day of the week to schedule (1-7, where 1 is Monday)
 * @param hour Hour to schedule the notification (0-23)
 * @param minute Minute to schedule the notification (0-59)
 * @returns Notification ID if scheduled, null otherwise
 */
export async function scheduleWeeklyMoodCheckIn(dayOfWeek: number = 5, hour: number = 18, minute: number = 0) {
    try {
        // Cancel any existing mood check-ins
        await cancelNotificationsByType('moodCheckIn');

        // Schedule the notification with a weekly repeating trigger
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Weekly Mood Check-In',
                body: 'Take a moment to reflect on your week and log your mood.',
                data: { type: 'moodCheckIn' },
                ...(Platform.OS === 'android' ? { channelId: 'mood-journal' } : {}),
            },
            trigger: {
                weekday: dayOfWeek,
                hour,
                minute,
                repeats: true,
            },
        });

        console.log(`Scheduled weekly mood check-in for day ${dayOfWeek} at ${hour}:${minute}`);
        return notificationId;
    } catch (error) {
        console.error('Error scheduling weekly mood check-in:', error);
        return null;
    }
}

/**
 * Set or update the notification badge count
 * @param count The number to display on the app icon badge
 * @returns true if successful, false otherwise
 */
export async function setBadgeCount(count: number) {
    try {
        await Notifications.setBadgeCountAsync(count);
        return true;
    } catch (error) {
        console.error('Error setting badge count:', error);
        return false;
    }
}

/**
 * Get the current notification badge count
 * @returns The current badge count or 0 if error
 */
export async function getBadgeCount() {
    try {
        return await Notifications.getBadgeCountAsync();
    } catch (error) {
        console.error('Error getting badge count:', error);
        return 0;
    }
}