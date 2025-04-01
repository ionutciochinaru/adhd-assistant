// frontend/src/screens/tasks/TasksScreen.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Platform,
    StatusBar,
    Alert
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import TaskItem from '../../components/TaskItem';
import { Task } from '../../utils/supabase';
import ScreenLayout from '../../components/ScreenLayout';

const TasksScreen = () => {
    const navigation = useNavigation();
    const { user, session } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

    // Refresh tasks every time the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user) {
                console.log('Screen focused, refreshing tasks for user:', user.id);
                fetchTasks();
            }
        }, [user])
    );

    // Set up a real-time subscription to task changes
    useEffect(() => {
        if (!user) return;

        console.log('Setting up real-time subscription for tasks');

        // Subscribe to changes in the tasks table for this user
        const subscription = supabase
            .channel('tasks-changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for inserts, updates, and deletes
                    schema: 'public',
                    table: 'tasks',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('Real-time update received:', payload.eventType);
                    // Refresh the tasks list when any change occurs
                    fetchTasks();
                }
            )
            .subscribe();

        // Clean up the subscription when the component unmounts
        return () => {
            console.log('Cleaning up real-time subscription');
            supabase.removeChannel(subscription);
        };
    }, [user]);

//