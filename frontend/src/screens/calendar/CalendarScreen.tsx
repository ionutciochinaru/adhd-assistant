// frontend/src/screens/calendar/CalendarScreen.tsx
import React, {useState, useEffect, useCallback} from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    Alert,
} from 'react-native';
import {Calendar as RNCalendar, DateData} from 'react-native-calendars';
import {useFocusEffect} from '@react-navigation/native';
import {supabase} from '../../utils/supabase';
import {useAuth} from '../../context/AuthContext';
import {Task} from '../../utils/supabase';
import ScreenLayout from "../../components/ScreenLayout";
import { normalizeDate, formatDate } from '../../utils/dateUtils';
import {COLORS, SPACING, Typography} from "../../utils/styles";

type MarkedDates = {
    [date: string]: {
        marked: boolean;
        dotColor: string;
        selected?: boolean;
        selectedColor?: string;
    };
};

const CalendarScreen = () => {
    const {user} = useAuth();
    const [selectedDate, setSelectedDate] = useState<string>(
        new Date().toISOString().split('T')[0] // Today in YYYY-MM-DD format
    );
    const [tasks, setTasks] = useState<Task[]>([]);
    const [markedDates, setMarkedDates] = useState<MarkedDates>({});
    const [loading, setLoading] = useState(true);

    // Fetch tasks when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (user) {
                fetchTasks();
            }
        }, [user, selectedDate]) // Add selectedDate
    );


    // Fetch all tasks for the calendar
    const fetchTasks = async () => {
        try {
            setLoading(true);

            const {data, error} = await supabase
                .from('tasks')
                .select('*')
                .eq('user_id', user?.id)
                .order('due_date', {ascending: true});

            if (error) {
                throw error;
            }

            // Create marked dates object for the calendar
            // Update marked dates
            const marked: MarkedDates = {};
            data?.forEach(task => {
                const dateStr = task.due_date?.split('T')[0];
                if (dateStr) {
                    marked[dateStr] = {
                        marked: true,
                        dotColor: task.priority === 'high' ? '#e74c3c' :
                            task.priority === 'medium' ? '#f39c12' :
                                '#2ecc71',
                    };
                }
            });

            // Ensure selected date is marked
            marked[selectedDate] = {
                selected: true,
                selectedColor: '#E1F0FE',
                marked: marked[selectedDate]?.marked || false,
                dotColor: marked[selectedDate]?.dotColor || '#3498db'
            };

            setMarkedDates(marked);

            // Filter tasks for the selected date
            const filteredTasks = data?.filter(task => {
                return task.due_date?.split('T')[0] === selectedDate;
            }) || [];

            setTasks(filteredTasks);
        } catch (error: any) {
            console.error('Error fetching tasks:', error.message);
            Alert.alert('Error', 'Failed to load tasks. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle date selection
    const onDateSelect = (date: DateData) => {
        const dateStr = date.dateString;
        setSelectedDate(dateStr);

        // Update UI with the filtered tasks for this date
        const filteredTasks = tasks.filter(task => {
            if (!task.due_date) return false;
            return normalizeDate(task.due_date) === dateStr;
        });

        setTasks(filteredTasks);
    };

    // Render a task item
    const renderTask = ({item}: { item: Task }) => (
        <TouchableOpacity
            style={[
                styles.taskItem,
                item.status === 'completed' && styles.completedTask
            ]}
        >
            <View style={styles.taskCheckbox}>
                {item.status === 'completed' && (
                    <View style={styles.checkboxInner}/>
                )}
            </View>

            <View style={styles.taskContent}>
                <Text
                    style={[
                        styles.taskTitle,
                        item.status === 'completed' && styles.completedTaskText
                    ]}
                    numberOfLines={1}
                >
                    {item.title}
                </Text>

                {item.description ? (
                    <Text
                        style={[
                            styles.taskDescription,
                            item.status === 'completed' && styles.completedTaskText
                        ]}
                        numberOfLines={2}
                    >
                        {item.description}
                    </Text>
                ) : null}
            </View>

            <View
                style={[
                    styles.taskPriority,
                    styles[`priority${item.priority}`]
                ]}
            />
        </TouchableOpacity>
    );

    return (
        <ScreenLayout
            title="Calendar"
        >
            <View style={styles.container}>
                <RNCalendar
                    current={selectedDate}
                    onDayPress={onDateSelect}
                    markedDates={markedDates}
                    markingType="dot"
                    theme={{
                        calendarBackground: COLORS.white,
                        textSectionTitleColor: COLORS.gray,
                        selectedDayBackgroundColor: COLORS.primary,
                        selectedDayTextColor: COLORS.white,
                        todayTextColor: COLORS.primary,
                        dayTextColor: COLORS.dark,
                        textDisabledColor: '#CCC',
                        dotColor: COLORS.primary,
                        selectedDotColor: COLORS.white,
                        arrowColor: COLORS.primary,
                        monthTextColor: COLORS.dark,
                        indicatorColor: COLORS.primary,
                        textDayFontWeight: '300',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: '500',
                    }}
                />

                <View style={styles.tasksHeader}>
                    <Text style={styles.tasksHeaderText}>
                        Tasks for {new Date(selectedDate).toLocaleDateString()}
                    </Text>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#3498db"/>
                    </View>
                ) : tasks.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No tasks for this day</Text>
                    </View>
                ) : (
                    <FlatList
                        data={tasks}
                        renderItem={renderTask}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.taskList}
                    />
                )}
            </View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.light,
    },
    header: {
        padding: 16,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tasksHeader: {
        padding: SPACING.md,
        backgroundColor: COLORS.white,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        marginTop: 10,
    },
    tasksHeaderText: {
        ...Typography.bodyMedium,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#999',
        fontStyle: 'italic',
    },
    taskList: {
        padding: 16,
    },
    taskItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    completedTask: {
        backgroundColor: '#F7F7F7',
    },
    taskCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#3498db',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxInner: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#3498db',
    },
    taskContent: {
        flex: 1,
    },
    taskTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    taskDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 6,
    },
    completedTaskText: {
        textDecorationLine: 'line-through',
        color: '#999',
    },
    taskPriority: {
        width: 4,
        height: '100%',
        borderRadius: 2,
        marginLeft: 12,
    },
    prioritylow: {
        backgroundColor: '#2ecc71',
    },
    prioritymedium: {
        backgroundColor: '#f39c12',
    },
    priorityhigh: {
        backgroundColor: '#e74c3c',
    },
});

export default CalendarScreen;