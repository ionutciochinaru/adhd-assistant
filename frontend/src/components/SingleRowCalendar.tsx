import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {Feather} from '@expo/vector-icons';
import moment from 'moment';
import {COLORS, RADIUS, SHADOWS, SPACING, Typography} from '../utils/styles';
import Svg, {Path} from 'react-native-svg';

// Constants for better readability and maintenance
const DATE_CARD_WIDTH = 64;
const DATE_CARD_MARGIN = SPACING.xs / 2;
const TOTAL_ITEM_WIDTH = DATE_CARD_WIDTH + DATE_CARD_MARGIN * 2;
const BUFFER_DAYS = 15;
const SCREEN_WIDTH = Dimensions.get('window').width;
const PROGRESS_STROKE_WIDTH = 5; // Thinner, more elegant stroke

type MarkedDates = {
    [date: string]: {
        dots?: { color: string }[];
        completionRate?: number;
    };
};

export type SingleRowCalendarMethods = {
    scrollToDate: (dateString: string) => void;
};

type SingleRowCalendarProps = {
    onDateSelect: (date: { dateString: string }) => void;
    selectedDate: string;
    markedDates?: MarkedDates;
    filter?: string;
    setFilter?: (filter: string) => void;
    getFilterCount?: (filter: string) => number;
};

export const SingleRowCalendar = forwardRef<SingleRowCalendarMethods, SingleRowCalendarProps>(({
                                                                                                   onDateSelect,
                                                                                                   selectedDate,
                                                                                                   markedDates = {},
                                                                                                   filter = 'all',
                                                                                                   setFilter = () => {},
                                                                                                   getFilterCount = () => 0,
                                                                                               }, ref) => {
    const [dates, setDates] = useState<moment.Moment[]>([]);
    const [currentMonth, setCurrentMonth] = useState<string>('');
    const [isFadingLeft, setIsFadingLeft] = useState(false);
    const [isFadingRight, setIsFadingRight] = useState(true);
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
        } else {
            // If there's already a selectedDate (coming back from task creation),
            // make sure we're using it
            updateMonth(moment(selectedDate));
        }
    }, []);

    // Scroll to today on initial load
    useEffect(() => {
        if (dates.length > 0 && !initialized.current) {
            initialized.current = true;

            // Check if there's a selectedDate, use that, otherwise use today
            const dateToScroll = selectedDate || today;

            // Use requestAnimationFrame to ensure layout is complete
            requestAnimationFrame(() => {
                if (selectedDate) {
                    // If we have a selected date (coming back from task creation), just scroll to it
                    scrollToInitialPosition();
                } else {
                    // If no selected date, then select and scroll to today
                    onDateSelect({dateString: today});
                    scrollToInitialPosition();
                }
            });
        }
    }, [dates, today, selectedDate, scrollToInitialPosition, onDateSelect]);

    // Call scrollToInitialPosition when the component mounts or when coming back after task creation
    useEffect(() => {
        // Wait for dates to be loaded and layout to be complete
        if (dates.length > 0 && selectedDate) {
            requestAnimationFrame(() => {
                scrollToInitialPosition();
            });
        }
    }, [dates.length, scrollToInitialPosition]);

    // Use a ref to track if this is the first render
    const isFirstRender = useRef(true);

    useEffect(() => {
        // Skip the first render since we handle that in the dates useEffect
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }

        // This will run when the selectedDate changes after the component is mounted
        if (selectedDate) {
            updateMonth(moment(selectedDate));
        }
    }, [selectedDate]);

    // Find date index in dates array
    const findDateIndex = useCallback((dateString: string) => {
        return dates.findIndex(date => date.format('YYYY-MM-DD') === dateString);
    }, [dates]);

    // Function to scroll to initial position when first loaded or returning to screen
    const scrollToInitialPosition = useCallback(() => {
        if (!scrollViewRef.current || dates.length === 0) return;

        // If we have a selected date, scroll to that position
        // but only on initial load or when returning to screen
        if (selectedDate) {
            const dateIndex = findDateIndex(selectedDate);

            if (dateIndex !== -1) {
                const itemPosition = dateIndex * TOTAL_ITEM_WIDTH;
                const halfScreenWidth = SCREEN_WIDTH / 2;
                const halfItemWidth = TOTAL_ITEM_WIDTH / 2;
                const scrollPosition = itemPosition - halfScreenWidth + halfItemWidth;

                // Use a non-animated scroll for initial positioning
                scrollViewRef.current.scrollTo({
                    x: scrollPosition + 150,
                    animated: false
                });
            }
        }
    }, [dates, selectedDate, findDateIndex]);

    useImperativeHandle(ref, () => ({
        scrollToDate: (dateString: string) => {
            if (!scrollViewRef.current) return;

            const dateIndex = findDateIndex(dateString);

            if (dateIndex !== -1) {
                const itemPosition = dateIndex * TOTAL_ITEM_WIDTH;
                const halfScreenWidth = SCREEN_WIDTH / 2;
                const halfItemWidth = TOTAL_ITEM_WIDTH / 2;
                const scrollPosition = itemPosition - halfScreenWidth + halfItemWidth;

                scrollViewRef.current.scrollTo({
                    x: scrollPosition + 150,
                    animated: true,
                    duration: 500
                });
            }
        }
    }));

    const updateMonth = (date: moment.Moment) => {
        setCurrentMonth(date.format('MMMM YYYY'));
    };

    // Scroll to today functionality
    const scrollToToday = useCallback(() => {
        if (!scrollViewRef.current) return;

        onDateSelect({dateString: today});

        const dateIndex = findDateIndex(today);

        if (dateIndex !== -1) {
            const itemPosition = dateIndex * TOTAL_ITEM_WIDTH;
            const halfScreenWidth = SCREEN_WIDTH / 2;
            const halfItemWidth = TOTAL_ITEM_WIDTH / 2;
            const scrollPosition = itemPosition - halfScreenWidth + halfItemWidth;

            // Animate the scroll to today
            scrollViewRef.current.scrollTo({
                x: scrollPosition + 150,
                animated: true,
                duration: 500
            });
        }
    }, [dates, findDateIndex, today, onDateSelect]);

    // Improved filter button rendering with clearer visual feedback
    const renderFilter = (key, label, currentFilter, setFilterFn, getCountFn, icon) => (
        <TouchableOpacity
            key={key}
            onPress={() => setFilterFn(key)}
            style={[
                styles.filterButton,
                currentFilter === key && styles.activeFilterButton
            ]}
            accessibilityLabel={`${label} filter with ${getCountFn(key)} items`}
            accessibilityRole="button"
            accessibilityState={{selected: currentFilter === key}}
        >
            {React.cloneElement(icon, {
                color: currentFilter === key ? COLORS.white : COLORS.textSecondary,
                size: 16
            })}
            {getCountFn(key) > 0 && (
                <View style={[
                    styles.badge,
                    key === 'overdue' ? styles.badgeOverdue : null,
                    key === 'completed' ? styles.badgeCompleted : null
                ]}>
                    <Text style={styles.badgeText}>{getCountFn(key)}</Text>
                </View>
            )}
            <Text style={[
                styles.filterLabel,
                currentFilter === key && styles.activeFilterLabel
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    // SVG paths for the progress indicator - adjusted for rectangular shape
    const getProgressPath = (size, width) => {
        // Calculate dimensions for a rounded rectangle
        const radius = 10; // Match the card's border radius
        const padding = PROGRESS_STROKE_WIDTH;

        // Adjusted to create a perfect rounded rectangle path
        const left = padding;
        const top = padding;
        const right = width - padding;
        const bottom = size - padding;

        // Create a single continuous path
        return `
        M ${left + radius},${top}
        L ${right - radius},${top}
        Q ${right},${top} ${right},${top + radius}
        L ${right},${bottom - radius}
        Q ${right},${bottom} ${right - radius},${bottom}
        L ${left + radius},${bottom}
        Q ${left},${bottom} ${left},${bottom - radius}
        L ${left},${top + radius}
        Q ${left},${top} ${left + radius},${top}
    `;
    };

// Modify the renderProgressIndicator to pass width
    const renderProgressIndicator = (completionRate = 0, size = DATE_CARD_WIDTH, width = DATE_CARD_WIDTH - 10) => {
        const path = getProgressPath(size, width);
        const pathLength = 270; // Approximate path length
        const dashOffset = pathLength - ((pathLength * completionRate) / 100);

        // Enhanced color based on completion rate for better ADHD distinction
        let color;
        if (completionRate === 100) {
            color = COLORS.success; // Green for completion
        } else if (completionRate >= 75) {
            color = COLORS.primary; // Blue for good progress
        } else if (completionRate >= 50) {
            color = COLORS.accent3; // Lighter green for halfway
        } else if (completionRate >= 25) {
            color = COLORS.accent2; // Orange for started
        } else {
            color = COLORS.accent1; // Red for just begun
        }

        return (
            <View style={[
                styles.progressSvgContainer,
                {
                    width: size + 10,
                    height: size + 15,
                    position: 'absolute',
                    left: 0, // Center horizontally
                    top: 0, // Align with the top of the date card
                    zIndex: 5
                }
            ]}>
                <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Background path - darker in dark mode */}
                    <Path
                        d={path}
                        fill="none"
                        stroke={COLORS.border}
                        strokeWidth={PROGRESS_STROKE_WIDTH}
                        strokeLinecap="round"
                    />

                    {/* Progress path */}
                    {completionRate > 0 && (
                        <Path
                            d={path}
                            fill="none"
                            stroke={color}
                            strokeWidth={PROGRESS_STROKE_WIDTH}
                            strokeLinecap="round"
                            strokeDasharray={pathLength}
                            strokeDashoffset={dashOffset}
                        />
                    )}
                </Svg>
            </View>
        );
    };

    // Improved DateComponent for better readability and visual clarity
    const DateComponent = ({date, selected}: { date: moment.Moment, selected: boolean }) => {
        const currentMoment = moment();
        const isToday = date.isSame(moment(), 'day');
        const isPastDay = date.isBefore(moment(), 'day');
        const isFutureDay = date.isAfter(moment(), 'day');

        const shouldShowSeparator = () => {
            if (!isToday) return false;

            const previousDate = moment(date).subtract(1, 'day');
            return previousDate.isBefore(currentMoment, 'day');
        };

        const day = date.format('ddd').toUpperCase();
        const dayNumber = date.format('D');
        const fullDate = date.format('YYYY-MM-DD');
        const dateMarks = markedDates[fullDate] || {};
        const taskCount = dateMarks.dots?.length || 0;
        const hasTasks = taskCount > 0;
        const isWeekend = date.day() === 0 || date.day() === 6;

        // Get completion rate for this date (default to 0 if not provided)
        const completionRate = dateMarks.completionRate || 0;
        const isComplete = completionRate === 100;

        // Calculate completed tasks count for the badge ratio
        const completedTasksCount = Math.round(taskCount * completionRate / 100);

        // Handle date selection without scrolling
        const handleDateSelect = () => {
            onDateSelect({dateString: fullDate});
            // No scrolling here - only update the selection
        };

        return (
            <View style={styles.dateContainer}>
                {/* Task indicator with completion ratio - now more visible */}
                {hasTasks && (
                    <View style={[
                        styles.taskIndicator,
                        selected && styles.selectedTaskIndicator,
                        isComplete && styles.completeTaskIndicator,
                        isPastDay && !isComplete && styles.pastDayTaskIndicator
                    ]}>
                        <View style={styles.taskCountContainer}>
                            <Text style={[
                                styles.taskCountText,
                                selected && styles.selectedTaskCountText,
                                isComplete && styles.completeTaskCountText,
                                isPastDay && !isComplete && !selected && styles.pastDayTaskCountText
                            ]}>
                                {`${completedTasksCount}/${taskCount}`}
                            </Text>
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    onPress={handleDateSelect}
                    style={[
                        styles.dateCardContainer
                    ]}
                    accessibilityLabel={`${isToday ? 'Today, ' : ''}${day} ${dayNumber} with ${taskCount} tasks, ${completedTasksCount} completed`}
                    accessibilityRole="button"
                    accessibilityState={{selected}}
                >
                    {/* Today Label */}
                    {isToday && !selected && (
                        <View style={styles.todayLabel}>
                            <Text style={styles.todayLabelText}>TODAY</Text>
                        </View>
                    )}

                    {/* SVG Progress Indicator */}
                    {hasTasks && renderProgressIndicator(completionRate, DATE_CARD_WIDTH)}

                    {/* Separator between past days and today/future */}
                    {shouldShowSeparator() && (
                        <View style={styles.separatorBetweenDates} />
                    )}

                    <View style={[
                        styles.dateCard,
                        isPastDay && !selected && styles.pastDateCard,
                        isToday && !selected && styles.todayDateCard,
                        isFutureDay && !selected && styles.futureDateCard,
                        selected && styles.selectedDateCard
                    ]}>
                        <Text style={[
                            styles.dayText,
                            isWeekend && !isPastDay && styles.weekendText,
                            selected && styles.selectedDayText,
                            isToday && !selected && styles.todayText,
                            isPastDay && !selected && styles.pastDayText,
                            isFutureDay && !selected && !isWeekend && styles.futureDayText
                        ]}>
                            {day}
                        </Text>
                        <Text style={[
                            styles.dateText,
                            isWeekend && !isPastDay && styles.weekendText,
                            selected && styles.selectedDateText,
                            isToday && !selected && styles.todayText,
                            isPastDay && !selected && styles.pastDayText,
                            isFutureDay && !selected && !isWeekend && styles.futureDayText
                        ]}>
                            {dayNumber}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <>
            <View style={styles.container}>
                {/* Improved header with clearer organization */}
                <View style={styles.headerContainer}>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.monthText}>{currentMonth}</Text>
                        <TouchableOpacity
                            onPress={scrollToToday}
                            style={styles.todayButton}
                            accessibilityLabel="Go to today"
                            accessibilityRole="button"
                        >
                            <Feather name="calendar" size={14} color={COLORS.white} style={styles.todayButtonIcon} />
                            <Text style={styles.todayButtonText}>Today</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Calendar scroll area with fade effect */}
                    <View style={styles.scrollViewContainer}>
                        <ScrollView
                            ref={scrollViewRef}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                            decelerationRate="normal"
                            scrollEventThrottle={16}
                            bounces={false}
                            removeClippedSubviews={true}
                            pagingEnabled={false}
                            directionalLockEnabled={true}
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
                </View>
            </View>

            {/* Filter Buttons with labels for better clarity - now outside the main container */}
            <View style={styles.filterContainer}>
                {renderFilter('all', 'All', filter, setFilter, getFilterCount, <Feather name="list" />)}
                {renderFilter('active', 'Active', filter, setFilter, getFilterCount, <Feather name="clock" />)}
                {renderFilter('overdue', 'Overdue', filter, setFilter, getFilterCount, <Feather name="alert-triangle" />)}
                {renderFilter('completed', 'Done', filter, setFilter, getFilterCount, <Feather name="check-circle" />)}
            </View>
        </>
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.md,
        overflow: 'visible',
        ...SHADOWS.medium,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    headerContainer: {
        paddingBottom: SPACING.sm,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    monthText: {
        ...Typography.h4,
        color: COLORS.textPrimary,
        fontWeight: '600',
    },
    todayButton: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        ...SHADOWS.small,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayButtonIcon: {
        marginRight: SPACING.xs,
    },
    todayButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    scrollViewContainer: {
        position: 'relative',
        height: 80,
        overflow: 'visible',
    },
    scrollContent: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: 40,
    },
    filterContainer: {
        paddingVertical: SPACING.xs,
        paddingHorizontal: SPACING.md,
        marginHorizontal: SPACING.xs,
        marginBottom: SPACING.xs,
        overflow: 'visible',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xs,
        borderRadius: RADIUS.md,
        flex: 1,
        marginHorizontal: 2,
        paddingVertical: SPACING.sm,
        position: 'relative',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    activeFilterButton: {
        backgroundColor: COLORS.primary,
        borderWidth: 1,
        borderColor: COLORS.primaryDark,
    },
    filterLabel: {
        ...Typography.tiny,
        color: COLORS.textSecondary,
        marginLeft: 4,
        fontWeight: '600',
    },
    activeFilterLabel: {
        color: COLORS.white,
    },
    badge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.round,
        paddingHorizontal: 4,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.background,
        ...SHADOWS.small,
    },
    badgeOverdue: {
        backgroundColor: COLORS.accent1,
    },
    badgeCompleted: {
        backgroundColor: COLORS.success,
    },
    badgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '700',
    },
    dateContainer: {
        alignItems: 'center',
        marginHorizontal: DATE_CARD_MARGIN,
        height: 80,
        width: DATE_CARD_WIDTH,
    },
    dateCardContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        width: DATE_CARD_WIDTH,
        height: 80,
    },
    progressSvgContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
        transform: [{scale: 1.1}],
    },
    todayLabel: {
        position: 'absolute',
        top: -20,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
    },
    todayLabelText: {
        ...Typography.tiny,
        color: COLORS.success,
        fontWeight: 'bold',
        fontSize: 8,
    },
    dateCard: {
        borderRadius: 14,
        padding: SPACING.xs,
        alignItems: 'center',
        justifyContent: 'center',
        height: DATE_CARD_WIDTH,
        width: DATE_CARD_WIDTH - 10,
        zIndex: 2,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectedDateCard: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primaryDark,
        borderRadius: 10,
    },
    todayDateCard: {
        backgroundColor: COLORS.cardBlue,
        borderColor: COLORS.primary,
        borderWidth: 2,
        borderRadius: 100,
    },
    separatorBetweenDates: {
        position: 'absolute',
        width: 3,
        borderRadius: 4,
        backgroundColor: COLORS.textTertiary,
        height: '50%',
        left: -4,
        zIndex: 10,
        top: 20,
    },
    pastDateCard: {
        backgroundColor: COLORS.cardShadow,
        opacity: 0.75,
    },
    futureDateCard: {
        backgroundColor: COLORS.background,
        borderColor: COLORS.border,
    },
    dayText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    selectedDayText: {
        color: COLORS.white,
    },
    todayText: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    pastDayText: {
        color: COLORS.textTertiary,
        fontWeight: '400',
    },
    futureDayText: {
        color: COLORS.textPrimary,
        fontWeight: '500',
    },
    dateText: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    selectedDateText: {
        color: COLORS.white,
    },
    weekendText: {
        color: COLORS.accent2,
    },
    taskIndicator: {
        position: 'absolute',
        top: -8,
        height: 20,
        backgroundColor: COLORS.background,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: RADIUS.round,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        zIndex: 10,
        ...SHADOWS.small,
        minWidth: 36,
    },
    selectedTaskIndicator: {
        backgroundColor: COLORS.primaryLight,
        borderColor: COLORS.primary,
    },
    completeTaskIndicator: {
        backgroundColor: COLORS.success,
        borderColor: COLORS.success,
    },
    pastDayTaskIndicator: {
        backgroundColor: COLORS.cardShadow,
        borderColor: COLORS.border,
        opacity: 0.7,
    },
    taskCountContainer: {
        minWidth: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    taskCountText: {
        color: COLORS.textPrimary,
        fontSize: 10,
        fontWeight: 'bold',
    },
    selectedTaskCountText: {
        color: COLORS.primaryDark,
    },
    completeTaskCountText: {
        color: COLORS.white,
    },
    pastDayTaskCountText: {
        color: COLORS.textTertiary,
    },
});

export default SingleRowCalendar;