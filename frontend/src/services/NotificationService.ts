// frontend/src/services/NotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Task } from '../utils/supabase';

// Configure notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Request notification permissions
export async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#3498DB',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for notifications!');
            return undefined;
        }

        token = (await Notifications.getExpoPushTokenAsync()).data;
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
}

// Schedule a task reminder notification
export async function scheduleTaskReminder(task: Task) {
    if (!task.due_date) return null;

    try {
        // Calculate notification time (1 hour before due date)
        const dueDate = new Date(task.due_date);
        const notificationDate = new Date(dueDate.getTime() - 60 * 60 * 1000); // 1 hour before

        // If due date is in the past, don't schedule a notification
        if (notificationDate <= new Date()) return null;

        // Schedule the notification
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Task Reminder',
                body: `"${task.title}" is due in 1 hour`,
                data: { taskId: task.id },
            },
            trigger: notificationDate,
        });

        return notificationId;
    } catch (error) {
        console.error('Error scheduling notification:', error);
        return null;
    }
}

// Cancel a scheduled notification
export async function cancelTaskReminder(notificationId: string) {
    try {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        return true;
    } catch (error) {
        console.error('Error canceling notification:', error);
        return false;
    }
}

// Schedule a daily task digest notification
export async function scheduleDailyDigest(hour: number = 8, minute: number = 0) {
    try {
        // Calculate when to send the notification (next occurrence of the specified time)
        const now = new Date();
        const scheduledTime = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hour,
            minute
        );

        // If the time has already passed today, schedule for tomorrow
        if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        // Schedule the notification
        const notificationId = await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Daily Task Digest',
                body: 'Check your tasks for today',
                data: { type: 'dailyDigest' },
            },
            trigger: {
                hour,
                minute,
                repeats: true,
            },
        });

        return notificationId;
    } catch (error) {
        console.error('Error scheduling daily digest:', error);
        return null;
    }
}

// Schedule a medication reminder
export async function scheduleMedicationReminder(
    medicationName: string,
    hour: number,
    minute: number,
    daysOfWeek: number[] = [1, 2, 3, 4, 5, 6, 7] // All days by default
) {
    try {
        const notificationIds: string[] = [];

        // Schedule a notification for each day of the week
        for (const day of daysOfWeek) {
            const notificationId = await Notifications.scheduleNotificationAsync({
                content: {
                    title: 'Medication Reminder',
                    body: `Time to take your ${medicationName}`,
                    data: { type: 'medication', name: medicationName },
                },
                trigger: {
                    hour,
                    minute,
                    weekday: day,
                    repeats: true,
                },
            });

            notificationIds.push(notificationId);
        }

        return notificationIds;
    } catch (error) {
        console.error('Error scheduling medication reminder:', error);
        return null;
    }
}

// Show an immediate notification
export async function showNotification(title: string, body: string, data: any = {}) {
    try {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                data,
            },
            trigger: null, // Show immediately
        });
        return true;
    } catch (error) {
        console.error('Error showing notification:', error);
        return false;
    }
}

// Get all scheduled notifications
export async function getAllScheduledNotifications() {
    try {
        const notifications = await Notifications.getAllScheduledNotificationsAsync();
        return notifications;
    } catch (error) {
        console.error('Error getting scheduled notifications:', error);
        return [];
    }
}

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
    try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        return true;
    } catch (error) {
        console.error('Error canceling all notifications:', error);
        return false;
    }
}