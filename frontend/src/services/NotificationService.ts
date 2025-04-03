// frontend/src/services/NotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Task } from '../utils/supabase';

// Configure notifications with improved handling and customized appearance
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        // Customize iOS presentation options
        ...(Platform.OS === 'ios' && {
            presentationOptions: [
                Notifications.PresentationOption.BADGE,
                Notifications.PresentationOption.SOUND,
                Notifications.PresentationOption.BANNER,
            ],
        }),
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
 * Check if a notification should be scheduled for a task
 * @param task The task to check
 * @returns Boolean indicating if notification should be scheduled
 */
function shouldScheduleNotification(task: Task): boolean {
    if (!task.due_date || task.status === 'completed') return false;

    const dueDate = new Date(task.due_date);
    const notificationDate = new Date(dueDate.getTime() - 60 * 60 * 1000); // 1 hour before
    const now = new Date();

    return notificationDate > now;
}

/**
 * Schedule a task reminder notification
 * @param task The task to create a reminder for
 * @returns Notification ID if scheduled, null otherwise
 */
export async function scheduleTaskReminder(task: Task) {
    if (!shouldScheduleNotification(task)) {
        console.log(`Not scheduling notification for task "${task.title}": Invalid conditions`);
        return null;
    }

    try {
        // Cancel any existing notifications for this task first to avoid duplicates
        await cancelTaskNotificationsByTaskId(task.id);

        // Calculate notification time (1 hour before due date)
        const dueDate = new Date(task.due_date!);
        const notificationDate = new Date(dueDate.getTime() - 60 * 60 * 1000); // 1 hour before

        // Format the due time for better readability in the notification
        const dueTimeStr = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // Get priority color as emoji
        let priorityEmoji = "🔵"; // default blue for medium
        if (task.priority === 'high') priorityEmoji = "🔴";
        if (task.priority === 'low') priorityEmoji = "🟢";

        // Schedule notification with appropriate channel for Android and custom styling
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: `${priorityEmoji} Task Reminder: ${task.title}`,
                body: `Due at ${dueTimeStr}. Time to focus on this task!`,
                data: {
                    taskId: task.id,
                    type: 'task-reminder',
                    priority: task.priority
                },
                // Custom sound if available
                sound: true,
                // Android specific
                ...(Platform.OS === 'android' ? {
                    channelId: 'task-reminders',
                    color: task.priority === 'high' ? '#e74c3c' :
                        task.priority === 'medium' ? '#f39c12' : '#2ecc71',
                    priority: Notifications.AndroidNotificationPriority.HIGH,
                } : {}),
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
 * Cancel notifications for a specific task by task ID
 * @param taskId ID of the task
 * @returns true if successful, false otherwise
 */
export async function cancelTaskNotificationsByTaskId(taskId: string) {
    try {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

        // Find all notifications for this task
        const taskNotifications = scheduledNotifications.filter(
            notification => notification.content.data?.taskId === taskId
        );

        // Cancel each notification
        for (const notification of taskNotifications) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
            console.log(`Canceled notification for task ID ${taskId}: ${notification.identifier}`);
        }

        return true;
    } catch (error) {
        console.error(`Error canceling notifications for task ${taskId}:`, error);
        return false;
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
                title: '📋 Daily Task Digest',
                body: 'Review your tasks for today and plan your day',
                data: { type: 'dailyDigest' },
                ...(Platform.OS === 'android' ? {
                    channelId: 'task-reminders',
                    color: '#3498db', // App primary color
                } : {}),
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