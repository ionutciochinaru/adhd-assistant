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

const SingleRowCalendar = forwardRef<SingleRowCalendarMethods, SingleRowCalendarProps>(({
                                                                                            onDateSelect,
                                                                                            selectedDate,
                                                                                            markedDates = {},
                                                                                            filter = 'all',
                                                                                            setFilter = () => {
                                                                                            },
                                                                                            getFilterCount = () => 0,
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
                size: 18
            })}
            {getCountFn(key) > 0 && (
                <View style={styles.badge}>
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

    // SVG paths for the progress indicator - simplified and more consistent
    const getProgressPath = (size) => {
        // Calculate dimensions for a perfect square with rounded corners
        const radius = 14; // Match the card's border radius
        const padding = PROGRESS_STROKE_WIDTH / 2;

        // Adjusted to create a perfect rounded rectangle path
        const left = padding;
        const top = padding;
        const right = size - padding;
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

    // Simplified progress indicator that's more visually consistent
    const renderProgressIndicator = (completionRate = 0, size = DATE_CARD_WIDTH) => {
        const path = getProgressPath(size);
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
            <View style={[styles.progressSvgContainer, {width: size, height: size}]}>
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
        const isToday = date.isSame(moment(), 'day');
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
                    ]}>
                        <View style={styles.taskCountContainer}>
                            {isComplete ? (
                                // Show checkmark for completed days
                                <Text style={[
                                    styles.taskCountText,
                                    selected && styles.selectedTaskCountText,
                                    isComplete && styles.completeTaskCountText
                                ]}>
                                    {`${completedTasksCount}/${taskCount}`}
                                </Text>
                            ) : (
                                // Show task ratio for incomplete days
                                <Text style={[
                                    styles.taskCountText,
                                    selected && styles.selectedTaskCountText,
                                    isComplete && styles.completeTaskCountText
                                ]}>
                                    {`${completedTasksCount}/${taskCount}`}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                <TouchableOpacity
                    onPress={handleDateSelect}
                    style={[
                        styles.dateCardContainer,
                        selected && styles.selectedDateCardContainer,
                    ]}
                    accessibilityLabel={`${isToday ? 'Today' : day} ${dayNumber} with ${taskCount} tasks, ${completedTasksCount} completed`}
                    accessibilityRole="button"
                    accessibilityState={{selected}}
                >
                    {/* SVG Progress Indicator */}
                    {hasTasks && renderProgressIndicator(completionRate, DATE_CARD_WIDTH)}

                    <View style={[
                        styles.dateCard,
                        selected && styles.selectedDateCard,
                        isToday && styles.todayDateCard
                    ]}>
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
                            isToday && styles.todayText,
                        ]}>
                            {dayNumber}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    return (
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
                        <Text style={styles.todayButtonText}>Today</Text>
                    </TouchableOpacity>
                </View>

                {/* Filter Buttons with labels for better clarity */}
                <View style={styles.filterContainer}>
                    {renderFilter('all', 'All', filter, setFilter, getFilterCount, <Feather name="grid"/>)}
                    {renderFilter('active', 'Active', filter, setFilter, getFilterCount, <Feather name="clock"/>)}
                    {renderFilter('overdue', 'Overdue', filter, setFilter, getFilterCount, <Feather
                        name="alert-triangle"/>)}
                    {renderFilter('completed', 'Done', filter, setFilter, getFilterCount, <Feather
                        name="check-circle"/>)}
                </View>
            </View>

            {/* Calendar scroll area */}
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
    );
});

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.white,
        borderRadius: RADIUS.lg,
        paddingVertical: SPACING.md,
        paddingHorizontal: SPACING.md,
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.md,
        overflow: 'visible',
        ...SHADOWS.medium,
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
        color: COLORS.textPrimary, // Deeper black #111827
        fontWeight: '600',
    },
    todayButton: {
        backgroundColor: COLORS.primary, // Deeper blue #2563EB
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    todayButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    scrollContent: {
        paddingVertical: SPACING.sm,
        paddingHorizontal: 20, // Add horizontal padding to ensure first and last items are properly visible
    },
    filterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: SPACING.sm,
        borderTopWidth: 1,
        borderTopColor: COLORS.border, // Slightly darker border #D1D5DB
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xs,
        borderRadius: RADIUS.md,
        backgroundColor: 'transparent',
        flex: 1,
        marginHorizontal: 2,
    },
    activeFilterButton: {
        backgroundColor: COLORS.primary, // Deeper blue #2563EB
        // Add a subtle border for better definition when active
        borderWidth: 1,
        borderColor: COLORS.primaryDark, // Deeper shade #1E40AF
    },
    filterLabel: {
        fontSize: 12,
        color: COLORS.textSecondary, // Darker gray #4B5563
        marginLeft: 4,
        fontWeight: '500',
    },
    activeFilterLabel: {
        color: COLORS.white,
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: COLORS.accent1, // More vibrant red #DC2626
        borderRadius: 10,
        paddingHorizontal: 4,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '600'
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
        height: 70,
    },
    progressSvgContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    dateCard: {
        backgroundColor: COLORS.background, // Slightly cooler background #F8FAFC
        borderRadius: 14,
        padding: SPACING.xs,
        alignItems: 'center',
        justifyContent: 'center',
        height: DATE_CARD_WIDTH - 10,
        width: DATE_CARD_WIDTH - 10,
        zIndex: 2,
    },
    selectedDateCard: {
        backgroundColor: COLORS.primary, // Deeper blue #2563EB
    },
    todayDateCard: {
        borderWidth: 3, // Increased for better visibility
        borderColor: COLORS.success, // Deeper green #059669
    },
    selectedDateCardContainer: {
        transform: [{scale: 1.05}],
    },
    dayText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textSecondary, // Darker gray #4B5563
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    selectedDayText: {
        color: COLORS.white,
    },
    todayText: {
        color: COLORS.success, // Deeper green #059669
        fontWeight: 'bold'
    },
    dateText: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary, // Deeper black #111827
    },
    selectedDateText: {
        color: COLORS.white,
    },
    weekendText: {
        color: COLORS.accent2, // Warmer orange #F59E0B
    },
    taskIndicator: {
        position: 'absolute',
        top: -8,
        height: 20,
        backgroundColor: COLORS.white,
        borderWidth: 1.5, // Slightly thicker for better visibility
        borderColor: COLORS.border, // Slightly darker border #D1D5DB
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
        minWidth: 36,
    },
    selectedTaskIndicator: {
        backgroundColor: COLORS.primaryLight, // Slightly more saturated #DBEAFE
        borderColor: COLORS.primary, // Deeper blue #2563EB
    },
    completeTaskIndicator: {
        backgroundColor: COLORS.success, // Deeper green #059669
        borderColor: COLORS.success, // Deeper green #059669
    },
    taskCountContainer: {
        minWidth: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    taskCountText: {
        color: COLORS.textPrimary, // Deeper black #111827 for better readability
        fontSize: 10,
        fontWeight: 'bold',
    },
    selectedTaskCountText: {
        color: COLORS.primaryDark, // Deeper blue #1E40AF
    },
    completeTaskCountText: {
        color: COLORS.white,
    },
});

export default SingleRowCalendar;