import React, {useState, useEffect, useRef} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Dimensions
} from 'react-native';
import moment from 'moment';
import {COLORS, SPACING, Typography} from '../utils/styles';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DATE_CARD_WIDTH = 65;
const BUFFER_DAYS = 45; // Additional days to load on both sides

type MarkedDates = {
    [date: string]: {
        dots?: { color: string }[];
    };
};

type SingleRowCalendarProps = {
    onDateSelect: (date: { dateString: string }) => void;
    selectedDate: string;
    markedDates?: MarkedDates;
    maxVisibleTasks?: number;
};

const SingleRowCalendar: React.FC<SingleRowCalendarProps> = ({
                                                                 onDateSelect,
                                                                 selectedDate,
                                                                 markedDates = {},
                                                                 maxVisibleTasks = 3
                                                             }) => {
    const [dates, setDates] = useState<moment.Moment[]>([]);
    const [currentMonth, setCurrentMonth] = useState<string>('');
    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        initializeDates();
    }, []);

    const initializeDates = () => {
        const _dates = [];
        for (let i = -BUFFER_DAYS; i < BUFFER_DAYS; i++) {
            _dates.push(moment().add(i, 'days'));
        }
        setDates(_dates);
        updateMonth(_dates[BUFFER_DAYS]);
    };

    const updateMonth = (date: moment.Moment) => {
        setCurrentMonth(date.format('MMMM'));
    };

    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.floor(offsetX / DATE_CARD_WIDTH);
        if (dates[index]) {
            updateMonth(dates[index]);
        }
    };

    const scrollToToday = () => {
        const today = moment().format('YYYY-MM-DD');
        const todayIndex = dates.findIndex(date => date.isSame(moment(), 'day'));

        if (todayIndex !== -1 && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({x: todayIndex * DATE_CARD_WIDTH, animated: true});

            // Select the today date
            onDateSelect({dateString: today});
        }
    };

    const DateComponent = ({date, selected}: { date: moment.Moment, selected: boolean }) => {
        const isToday = date.isSame(moment(), 'day');
        const day = isToday ? 'Today' : date.format('ddd').toUpperCase();
        const dayNumber = date.format('D');
        const fullDate = date.format('YYYY-MM-DD');
        const dateMarks = markedDates[fullDate] || {};
        const taskCount = dateMarks.dots?.length || 0;
        const hasTasks = taskCount > 0;
        const isWeekend = date.day() === 0 || date.day() === 6;

        // Calculate dot scale based on task count (capped at maxVisibleTasks)
        const visibleCount = Math.min(taskCount, maxVisibleTasks);
        const dotScale = 1 + Math.min((taskCount / maxVisibleTasks) * 0.5, 1.5);

        return (
            <View style={styles.dateContainer}>
                {/* Task Indicator Bar (above the card) */}
                {hasTasks && (
                    <View style={[
                        styles.taskIndicator,
                        selected && styles.selectedTaskIndicator,
                        {width: 'auto'}
                    ]}>
                        <View>
                            <Text style={[
                                styles.taskCountText,
                                selected && styles.selectedTaskCountText
                            ]}>
                                {taskCount} {taskCount > 1 ? 'tasks' : 'task'}
                            </Text>
                        </View>
                    </View>
                )}
                <TouchableOpacity
                    onPress={() => onDateSelect({dateString: fullDate})}
                    style={[
                        styles.dateCard,
                        selected && styles.selectedDateCard,
                    ]}
                >
                    <Text style={[
                        styles.dayText,
                        isWeekend && styles.weekendText,
                        selected && styles.selectedDayText,
                        isToday && styles.todayText,
                    ]}>
                        {day}
                    </Text>
                    <Text style={[
                        styles.dateText,
                        isWeekend && styles.weekendText,
                        selected && styles.selectedDateText,
                    ]}>
                        {dayNumber}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerContainer}>
                <Text style={styles.monthText}>{currentMonth}</Text>
                <TouchableOpacity onPress={scrollToToday} style={styles.todayButton}>
                    <Text style={styles.todayButtonText}>Today</Text>
                </TouchableOpacity>
            </View>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
            >
                {dates.map((date, index) => (
                    <DateComponent
                        key={index}
                        date={date}
                        selected={date.format('YYYY-MM-DD') === selectedDate}
                    />
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        paddingVertical: SPACING.md + 10,
        paddingHorizontal: SPACING.md,
        overflow: 'visible',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: SPACING.sm,
    },
    monthText: {
        ...Typography.h4,
        color: COLORS.textPrimary,
    },
    todayButton: {
        backgroundColor: COLORS.primaryDark,
        borderRadius: 10,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
    },
    todayButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
    },
    dateCard: {
        backgroundColor: COLORS.background,
        borderRadius: 15,
        padding: SPACING.sm,
        marginHorizontal: SPACING.xs,
        alignItems: 'center',
        height: 70,
        width: DATE_CARD_WIDTH,
    },
    selectedDateCard: {
        backgroundColor: COLORS.primaryDark,
    },
    dayText: {
        fontWeight: 'bold',
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    selectedDayText: {
        color: COLORS.white,
    },
    todayCard: {
        color: COLORS.white,
    },
    todayText: {
        color: COLORS.success,
        fontWeight: 'bold'
    },
    fadedText: {
        color: COLORS.textSecondary,
    },
    dateText: {
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    selectedDateText: {
        color: COLORS.white,
        fontWeight: 'bold',
    },
    dotContainer: {
        flexDirection: 'row',
        marginTop: SPACING.xs,
    },
    weekendText: {
        color: COLORS.accent2,
    },
    badge: {
        backgroundColor: COLORS.white,
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SPACING.xxs,
    },
    largeBadge: {
        width: 24,
    },
    selectedBadge: {
        backgroundColor: COLORS.primaryLight,
    },
    badgeText: {
        fontSize: 10,
        color: COLORS.black,
        fontWeight: 'bold',
    },
    selectedBadgeText: {
        color: COLORS.black,
    },
    dateContainer: {
        alignItems: 'center',
        marginHorizontal: SPACING.xs,
        marginTop: 15, // Make space for the indicator
        height: 80, // Increased height to accommodate indicator
    },
    taskIndicator: {
        position: 'absolute',
        top: -12, // Adjusted positioning
        height: 20,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 6,
        zIndex: 10, // Higher z-index
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2, // For Android
    },
    selectedTaskIndicator: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primaryLight,
    },
    taskCountText: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontWeight: 'bold',
    },
    selectedTaskCountText: {
        color: COLORS.textSecondary,
    },
    hasTasksCard: {
        marginTop: 10,
    },
});

export default SingleRowCalendar;
