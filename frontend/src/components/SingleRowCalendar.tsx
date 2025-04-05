import React, {useState, useEffect, useRef, forwardRef, useCallback, useImperativeHandle} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Dimensions,
} from 'react-native';
import moment from 'moment';
import {COLORS, SPACING, Typography} from '../utils/styles';

const DATE_CARD_WIDTH = 65;
const DATE_CARD_MARGIN = SPACING.xs * 2;
const TOTAL_ITEM_WIDTH = DATE_CARD_WIDTH + DATE_CARD_MARGIN;
const BUFFER_DAYS = 15;
const SCREEN_WIDTH = Dimensions.get('window').width;

type MarkedDates = {
    [date: string]: {
        dots?: { color: string }[];
    };
};

export type SingleRowCalendarMethods = {
    scrollToDate: (dateString: string) => void;
};

type SingleRowCalendarProps = {
    onDateSelect: (date: { dateString: string }) => void;
    selectedDate: string;
    markedDates?: MarkedDates;
};

const SingleRowCalendar = forwardRef<SingleRowCalendarMethods, SingleRowCalendarProps>(({
                                                                                            onDateSelect,
                                                                                            selectedDate,
                                                                                            markedDates = {},
                                                                                        }, ref) => {
    const [dates, setDates] = useState<moment.Moment[]>([]);
    const [currentMonth, setCurrentMonth] = useState<string>('');
    const scrollViewRef = useRef<ScrollView>(null);
    const initialized = useRef(false);
    const today = moment().format('YYYY-MM-DD');

    // Initialize dates when component mounts
    useEffect(() => {
        const _dates = [];
        const todayMoment = moment();

        for (let i = -BUFFER_DAYS; i < BUFFER_DAYS + 30; i++) {
            _dates.push(moment(todayMoment).add(i, 'days'));
        }

        setDates(_dates);
        updateMonth(todayMoment);

        // Set initial selected date to today if none is provided
        if (!selectedDate) {
            onDateSelect({dateString: today});
        }
    }, []);

    // Scroll to today on initial load
    useEffect(() => {
        if (dates.length > 0 && !initialized.current) {
            initialized.current = true;

            // Use requestAnimationFrame to ensure layout is complete
            requestAnimationFrame(() => {
                scrollToDate(today);
            });
        }
    }, [dates]);

    // When selectedDate changes from external source
    useEffect(() => {
        if (dates.length > 0 && selectedDate && selectedDate !== today) {
            updateMonth(moment(selectedDate));
            scrollToDate(selectedDate);
        }
    }, [selectedDate, dates]);

    const scrollToDate = useCallback((dateString: string) => {
        if (!scrollViewRef.current) return;

        const dateIndex = dates.findIndex(date =>
            date.format('YYYY-MM-DD') === dateString
        );

        if (dateIndex !== -1) {
            const itemPosition = dateIndex * TOTAL_ITEM_WIDTH;

            let scrollPosition;
                const halfScreenWidth = SCREEN_WIDTH / 2;
                const halfItemWidth = TOTAL_ITEM_WIDTH / 2;
                scrollPosition = itemPosition - halfScreenWidth + halfItemWidth;

            scrollViewRef.current.scrollTo({
                x: scrollPosition + 150,
                animated: initialized.current
            });
        }
    }, [dates]);

    useImperativeHandle(ref, () => ({
        scrollToDate: (dateString: string) => scrollToDate(dateString)
    }));

    const updateMonth = (date: moment.Moment) => {
        setCurrentMonth(date.format('MMMM YYYY'));
    };

    const scrollToToday = () => {
        onDateSelect({dateString: today});
        scrollToDate(today);
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

        return (
            <View style={styles.dateContainer}>
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

    const getScrollViewPadding = () => {
        return {
            paddingHorizontal: 0
        };
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
                contentContainerStyle={[
                    styles.scrollContent,
                    getScrollViewPadding()
                ]}
                decelerationRate="fast"
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
});

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
    scrollContent: {
        paddingVertical: SPACING.xs,
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
    todayText: {
        color: COLORS.success,
        fontWeight: 'bold'
    },
    dateText: {
        fontSize: 16,
        color: COLORS.textPrimary,
    },
    selectedDateText: {
        color: COLORS.white,
        fontWeight: 'bold',
    },
    weekendText: {
        color: COLORS.accent2,
    },
    dateContainer: {
        alignItems: 'center',
        marginHorizontal: SPACING.xs,
        marginTop: 15,
        height: 80,
    },
    taskIndicator: {
        position: 'absolute',
        top: -12,
        height: 20,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 6,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
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
});

export default SingleRowCalendar;