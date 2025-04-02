// frontend/src/hooks/useTaskNotifications.ts
import * as Notifications from 'expo-notifications';
import {useEffect, useRef, useState} from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { Task } from '../utils/supabase';
import * as NotificationService from '../services/NotificationService';

export function useTaskNotifications() {
    const { user } = useAuth();
    const [notificationMap, setNotificationMap] = useState<Record<string, string>>({});
    const isMounted = useRef(true);

    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (user) {
            loadNotificationSettings();
            syncTaskNotifications();
        }
    }, [user]);

    // Load the user's notification settings and notification IDs
    const loadNotificationSettings = async () => {
        try {
            // Get user preferences for notifications
            const { data: userData, error } = await supabase
                .from('users')
                .select('notification_preferences')
                .eq('id', user?.id)
                .maybeSingle();

            if (error) throw error;

            // Load the mapping between task IDs and notification IDs
            const storedMap = userData?.notification_preferences?.taskNotifications || {};
            setNotificationMap(storedMap);
        } catch (error) {
            console.error('Error loading notification settings:', error);
        }
    };

    // Save the notification map to user preferences
    const saveNotificationMap = async (updatedMap: Record<string, string>) => {
        try {
            const { error } = await supabase
                .from('users')
                .update({
                    notification_preferences: {
                        taskNotifications: updatedMap,
                        // Preserve other notification preferences
                        ...user?.user_metadata?.notification_preferences,
                        taskNotifications: updatedMap
                    }
                })
                .eq('id', user?.id);

            if (error) throw error;

            if (isMounted.current) {
                setNotificationMap(updatedMap);
            }
        } catch (error) {
            console.error('Error saving notification map:', error);
        }
    };

    // Schedule a notification for a task
    const scheduleTaskNotification = async (task: Task) => {
        try {
            // Cancel any existing notification for this task
            if (notificationMap[task.id]) {
                await NotificationService.cancelTaskReminder(notificationMap[task.id]);
            }

            // Only schedule notifications for active tasks with a due date
            if (task.status === 'active' && task.due_date) {
                const notificationId = await NotificationService.scheduleTaskReminder(task);

                if (notificationId) {
                    const updatedMap = { ...notificationMap, [task.id]: notificationId };
                    await saveNotificationMap(updatedMap);
                    return true;
                }
            } else if (task.status === 'completed' && notificationMap[task.id]) {
                // If task is completed, remove its notification
                const updatedMap = { ...notificationMap };
                delete updatedMap[task.id];
                await saveNotificationMap(updatedMap);
            }

            return false;
        } catch (error) {
            console.error('Error scheduling task notification:', error);
            return false;
        }
    };

    // Cancel a notification for a task
    const cancelTaskNotification = async (taskId: string) => {
        try {
            if (notificationMap[taskId]) {
                await NotificationService.cancelTaskReminder(notificationMap[taskId]);

                const updatedMap = { ...notificationMap };
                delete updatedMap[taskId];
                await saveNotificationMap(updatedMap);

                return true;
            }
            return false;
        } catch (error) {
            console.error('Error canceling task notification:', error);
            return false;
        }
    };

    // Sync notifications for all active tasks
    const syncTaskNotifications = async () => {
        try {
            // Get all active tasks with due dates
            const { data: tasks, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user?.id)
                .eq('status', 'active')
                .not('due_date', 'is', null);

            if (error) throw error;

            if (!tasks || tasks.length === 0) return;

            console.log(`Syncing notifications for ${tasks.length} tasks`);

            // First, cancel all existing task notifications
            await NotificationService.cancelAllNotifications();

            // Create a new map for notifications
            const newNotificationMap: Record<string, string> = {};

            // Schedule notifications for each task
            for (const task of tasks) {
                if (task.due_date) {
                    const notificationId = await NotificationService.scheduleTaskReminder(task);
                    if (notificationId) {
                        newNotificationMap[task.id] = notificationId;
                    }
                }
            }

            // Save the new notification map
            await saveNotificationMap(newNotificationMap);

            console.log(`Scheduled ${Object.keys(newNotificationMap).length} notifications`);
        } catch (error) {
            console.error('Error syncing task notifications:', error);
        }
    };

    // Enable daily digest notifications
    const enableDailyDigest = async (hour = 8, minute = 0) => {
        try {
            const notificationId = await NotificationService.scheduleDailyDigest(hour, minute);

            if (notificationId) {
                const preferences = {
                    ...user?.user_metadata?.notification_preferences,
                    dailyDigest: {
                        enabled: true,
                        id: notificationId,
                        hour,
                        minute
                    }
                };

                await supabase
                    .from('users')
                    .update({
                        notification_preferences: preferences
                    })
                    .eq('id', user?.id);

                return true;
            }

            return false;
        } catch (error) {
            console.error('Error enabling daily digest:', error);
            return false;
        }
    };

    // Disable daily digest notifications
    const disableDailyDigest = async () => {
        try {
            const { data: userData, error } = await supabase
                .from('users')
                .select('notification_preferences')
                .eq('id', user?.id)
                .maybeSingle();

            if (error) throw error;

            const digestId = userData?.notification_preferences?.dailyDigest?.id;

            if (digestId) {
                await NotificationService.cancelTaskReminder(digestId);
            }

            const preferences = {
                ...userData?.notification_preferences,
                dailyDigest: {
                    enabled: false
                }
            };

            await supabase
                .from('users')
                .update({
                    notification_preferences: preferences
                })
                .eq('id', user?.id);

            return true;
        } catch (error) {
            console.error('Error disabling daily digest:', error);
            return false;
        }
    };

    return {
        scheduleTaskNotification,
        cancelTaskNotification,
        syncTaskNotifications,
        enableDailyDigest,
        disableDailyDigest,
        notificationMap
    };
}