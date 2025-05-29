import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    Dimensions,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { JournalStackParamList } from '../../navigation/JournalNavigator';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { MoodJournal } from '../../utils/supabase';
import ScreenLayout from '../../components/ScreenLayout';
import { COLORS, SPACING, Typography, RADIUS, SHADOWS, MOOD_COLOR_MAP, MOOD_EMOJI_MAP, FONTS } from '../../utils/styles';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import BackButton from '../../components/BackButton';

type NavigationProp = StackNavigationProp<JournalStackParamList, 'MoodJournalList'>;

interface ExtendedMoodJournal extends MoodJournal {
    avg_rating: number; // Now always calculated
}

// Define the types of items that can appear in our FlatList
type DailyEntryItem =
    | { type: 'monthHeader'; id: string; monthYear: string; date: string }
    | { type: 'journalEntry'; id: string; journal: ExtendedMoodJournal; isCurrentDay: boolean; canAddEntry: boolean }
    | { type: 'addEntryPrompt'; id: string; date: string; isCurrentDay: boolean; canAddEntry: boolean }
    | { type: 'unloggedPeriod'; id: string; startDate: string; endDate: string; duration: number };

const MoodJournalListScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const { user } = useAuth();
    const [journalsMap, setJournalsMap] = useState<Map<string, ExtendedMoodJournal>>(new Map());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentMonthDisplayed, setCurrentMonthDisplayed] = useState(moment()); // For the month filter in the header

    const flatListRef = useRef<FlatList<DailyEntryItem>>(null);

    // Helper to calculate avg_rating for a journal entry
    const calculateAvgRating = (journal: MoodJournal): number => {
        const { mood_rating, focus_rating, energy_rating, sleep_quality } = journal;
        const sum = mood_rating + focus_rating + energy_rating + sleep_quality;
        return parseFloat((sum / 4).toFixed(1)); // Average of 4 ratings, rounded to 1 decimal
    };

    // Helper to get mood color based on rating
    const getMoodColor = (rating: number | undefined) => {
        if (rating === undefined || rating < 1) return COLORS.card;
        const moodLevel = Math.round(rating);
        return MOOD_COLOR_MAP[moodLevel as keyof typeof MOOD_COLOR_MAP];
    };

    // Helper to get mood emoji based on rating
    const getMoodEmoji = (rating: number | undefined) => {
        if (rating === undefined || rating < 1) return '❓';
        const moodLevel = Math.round(rating);
        return MOOD_EMOJI_MAP[moodLevel as keyof typeof MOOD_EMOJI_MAP];
    };

    // Helper to get mood label based on rating
    const getMoodLabel = (rating: number | undefined) => {
        if (rating === undefined || rating < 1) return 'N/A';
        const moodLevel = Math.round(rating);
        const moodOption = [
            { value: 1, label: 'Terrible' },
            { value: 2, label: 'Bad' },
            { value: 3, label: 'Okay' },
            { value: 4, label: 'Good' },
            { value: 5, label: 'Great' },
        ].find(option => option.value === moodLevel);
        return moodOption ? moodOption.label : 'N/A';
    };

    const fetchJournalEntries = async () => {
        if (!user) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('mood_journals')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching mood journals:', error.message);
                Alert.alert('Error', 'Failed to fetch journal entries.');
                return;
            }

            const newJournalsMap = new Map<string, ExtendedMoodJournal>();
            data?.forEach(journal => {
                const dateKey = moment(journal.created_at).format('YYYY-MM-DD');
                const avg_rating = calculateAvgRating(journal);
                newJournalsMap.set(dateKey, { ...journal, avg_rating: avg_rating } as ExtendedMoodJournal);
            });
            setJournalsMap(newJournalsMap);
        } catch (error) {
            console.error('Unexpected error fetching mood journals:', error);
            Alert.alert('Error', 'An unexpected error occurred.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchJournalEntries();
        }, [user])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchJournalEntries();
    }, [user]);

    // Calculate statistics for the MonthStatisticsDisplay
    const calculateMonthStatistics = useCallback(() => {
        const monthStart = moment(currentMonthDisplayed).startOf('month');
        const monthEnd = moment(currentMonthDisplayed).endOf('month');

        let currentStreak = 0;
        let moodSum = 0;
        let entryCount = 0;
        let happy = 0;
        let bad = 0;
        let neutral = 0;

        // Calculate streak starting from today backwards
        let dayToCheck = moment().startOf('day'); // Always start from today's date for streak calculation
        while (journalsMap.has(dayToCheck.format('YYYY-MM-DD'))) {
            currentStreak++;
            dayToCheck.subtract(1, 'day');
        }

        // Calculate overall mood, happy/bad/neutral days for the current displayed month
        let tempDay = moment(monthStart);
        while (tempDay.isSameOrBefore(monthEnd)) {
            const dateKey = tempDay.format('YYYY-MM-DD');
            const journal = journalsMap.get(dateKey);

            if (journal && journal.avg_rating !== undefined) {
                moodSum += journal.avg_rating;
                entryCount++;
                if (journal.avg_rating >= 4) { // Ratings 4 and 5 are "Good" and "Great"
                    happy++;
                } else if (journal.avg_rating <= 2) { // Ratings 1 and 2 are "Terrible" and "Bad"
                    bad++;
                } else { // Rating 3 is "Okay"
                    neutral++;
                }
            }
            tempDay.add(1, 'day');
        }

        const overallMoodScore = entryCount > 0 ? parseFloat((moodSum / entryCount).toFixed(1)) : 0;

        return {
            streak: currentStreak,
            overallMoodScore: overallMoodScore,
            happyDays: happy,
            badDays: bad,
            neutralDays: neutral,
            totalEntries: entryCount,
        };
    }, [journalsMap, currentMonthDisplayed]);

    const monthStats = calculateMonthStatistics();

    // Generate daily entries for display in the FlatList, including month headers and unlogged periods
    const generateDisplayItems = useCallback(() => {
        const displayItems: DailyEntryItem[] = [];
        const today = moment().startOf('day');
        const earliestDate = moment('2025-01-01').startOf('day'); // User requested to go back to 01/01/2025

        let currentDay = moment(earliestDate); // Start from earliest date chronologically
        const allDaysInPeriod: { date: string; journal?: ExtendedMoodJournal }[] = [];

        // 1. Generate all raw daily entries from earliestDate to today
        while (currentDay.isSameOrBefore(today)) {
            const dateKey = currentDay.format('YYYY-MM-DD');
            allDaysInPeriod.push({
                date: dateKey,
                journal: journalsMap.get(dateKey),
            });
            currentDay.add(1, 'day');
        }

        // 2. Process in chronological order to identify streaks and add month headers
        let unloggedStreakStart: moment.Moment | null = null;
        let lastMonthAdded = ''; // Keep track of the last month a header was added for
        let itemIdCounter = 0;

        for (let i = 0; i < allDaysInPeriod.length; i++) {
            const { date, journal } = allDaysInPeriod[i];
            const momentDate = moment(date);
            const isCurrentDay = momentDate.isSame(today, 'day');
            const canAddEntry = momentDate.isSameOrBefore(today);

            const currentMonthYear = momentDate.format('MMMMiedenis');

            // Insert month header if month changes, or if it's the very first item being processed
            if (currentMonthYear !== lastMonthAdded) {
                displayItems.push({
                    type: 'monthHeader',
                    id: `month-header-${currentMonthYear}-${itemIdCounter++}`,
                    monthYear: currentMonthYear,
                    date: date,
                });
                lastMonthAdded = currentMonthYear;
            }

            if (journal) {
                // If a journal entry is found, first close any ongoing unlogged streak
                if (unloggedStreakStart) {
                    const streakEndDate = moment(unloggedStreakStart); // The *earliest* day in the unlogged streak
                    const streakStartDate = momentDate.clone().subtract(1, 'day'); // The day *before* the current logged day

                    // Calculate duration correctly (inclusive of start and end dates)
                    const duration = Math.abs(streakStartDate.diff(streakEndDate, 'days')) + 1;

                    if (duration > 0) {
                        displayItems.push({
                            type: 'unloggedPeriod',
                            id: `unlogged-${streakEndDate.format('YYYY-MM-DD')}-${streakStartDate.format('YYYY-MM-DD')}-${itemIdCounter++}`,
                            startDate: streakEndDate.format('YYYY-MM-DD'), // Earliest day of the streak
                            endDate: streakStartDate.format('YYYY-MM-DD'), // Latest day of the streak
                            duration: duration,
                        });
                    }
                    unloggedStreakStart = null; // Reset the streak
                }
                // Add the journal entry
                displayItems.push({
                    type: 'journalEntry',
                    id: `journal-${journal.id}`,
                    journal: journal,
                    isCurrentDay: isCurrentDay,
                    canAddEntry: canAddEntry,
                });
            } else {
                // No journal entry for this day, so it's an unlogged day
                if (!unloggedStreakStart) {
                    unloggedStreakStart = moment(momentDate); // Start a new unlogged streak
                }

                // Check if the streak ends here (next day has a journal, or it's the last day in overall period)
                const isLastDayInPeriod = (i === allDaysInPeriod.length - 1);
                const isNextDayLogged = (i + 1 < allDaysInPeriod.length && allDaysInPeriod[i+1].journal);

                if (isLastDayInPeriod || isNextDayLogged) {
                    const streakEndDate = moment(unloggedStreakStart); // Earliest day of the streak
                    const streakStartDate = moment(momentDate); // Latest day of the streak (current day in loop)

                    const duration = Math.abs(streakStartDate.diff(streakEndDate, 'days')) + 1;

                    if (duration === 1) {
                        // Single empty day: display as an "Add Entry" prompt
                        displayItems.push({
                            type: 'addEntryPrompt',
                            id: `empty-single-${date}-${itemIdCounter++}`,
                            date: date,
                            isCurrentDay: isCurrentDay,
                            canAddEntry: canAddEntry,
                        });
                    } else {
                        // Unlogged period of multiple days
                        displayItems.push({
                            type: 'unloggedPeriod',
                            id: `unlogged-${streakEndDate.format('YYYY-MM-DD')}-${streakStartDate.format('YYYY-MM-DD')}-${itemIdCounter++}`,
                            startDate: streakEndDate.format('YYYY-MM-DD'), // Earliest day of the streak
                            endDate: streakStartDate.format('YYYY-MM-DD'), // Latest day of the streak
                            duration: duration,
                        });
                    }
                    unloggedStreakStart = null; // Reset the streak
                }
            }
        }

        // 3. Reverse the array to have the newest entries at the top
        return displayItems.reverse();
    }, [journalsMap]);

    const displayItems = generateDisplayItems();

    // Effect to scroll to the current month/today's entry after data loads and items are generated
    useEffect(() => {
        if (displayItems.length > 0 && flatListRef.current && !loading) {
            // Find the index of today's entry or the current month header if today has no entry
            const todayKey = moment().format('YYYY-MM-DD');
            const currentMonthYear = moment().format('MMMMiedenis');

            let targetIndex = -1;

            // Prioritize today's entry (journal or add prompt)
            targetIndex = displayItems.findIndex(item =>
                (item.type === 'journalEntry' && item.journal.date === todayKey) ||
                (item.type === 'addEntryPrompt' && item.date === todayKey)
            );

            // If today's entry not found, find the current month header
            if (targetIndex === -1) {
                targetIndex = displayItems.findIndex(item =>
                    item.type === 'monthHeader' && item.monthYear === currentMonthYear
                );
            }

            if (targetIndex !== -1) {
                flatListRef.current.scrollToIndex({
                    index: targetIndex,
                    animated: false, // Set to false for immediate jump, true for smooth scroll
                    viewPosition: 0, // Scroll to top
                });
            }
        }
    }, [displayItems, loading]); // Trigger when displayItems change (after fetch) or loading state changes

    const scrollToCurrentMonth = useCallback(() => {
        if (displayItems.length > 0 && flatListRef.current) {
            const todayKey = moment().format('YYYY-MM-DD');
            const currentMonthYear = moment().format('MMMMiedenis');

            let targetIndex = -1;

            targetIndex = displayItems.findIndex(item =>
                (item.type === 'journalEntry' && item.journal.date === todayKey) ||
                (item.type === 'addEntryPrompt' && item.date === todayKey)
            );

            if (targetIndex === -1) {
                targetIndex = displayItems.findIndex(item =>
                    item.type === 'monthHeader' && item.monthYear === currentMonthYear
                );
            }

            if (targetIndex !== -1) {
                flatListRef.current.scrollToIndex({
                    index: targetIndex,
                    animated: true,
                    viewPosition: 0,
                });
            }
        }
    }, [displayItems]); // Depend on displayItems to ensure list is populated

    const navigateMonth = (direction: 'prev' | 'next') => {
        let newMonth;
        if (direction === 'prev') {
            newMonth = currentMonthDisplayed.clone().subtract(1, 'month');
        } else {
            newMonth = currentMonthDisplayed.clone().add(1, 'month');
        }
        setCurrentMonthDisplayed(newMonth);

        // Find the index of the new month in the displayItems and scroll to it
        if (flatListRef.current) {
            const targetMonthYear = newMonth.format('MMMMiedenis');
            const targetIndex = displayItems.findIndex(item =>
                item.type === 'monthHeader' && item.monthYear === targetMonthYear
            );
            if (targetIndex !== -1) {
                flatListRef.current.scrollToIndex({
                    index: targetIndex,
                    animated: true,
                    viewPosition: 0,
                });
            } else {
                // If month header not found (e.g., navigating to a month without entries)
                Alert.alert("Info", `No entries found for ${targetMonthYear}.`);
            }
        }
    };

    const renderItem = ({ item }: { item: DailyEntryItem }) => {
        switch (item.type) {
            case 'monthHeader':
                return (
                    <View style={styles.monthHeaderContainer}>
                        <Text style={styles.monthHeaderText}>{item.monthYear}</Text>
                    </View>
                );
            case 'journalEntry':
                const { journal, isCurrentDay } = item;
                const formattedDate = moment(journal.date).format('DD');
                const dayOfWeek = moment(journal.date).format('ddd').toUpperCase();
                return (
                    <View style={styles.dayEntryRow}>
                        <View style={styles.dayDateCard}>
                            <Text style={styles.dayDateText}>{formattedDate}</Text>
                            <Text style={styles.dayOfWeekText}>{dayOfWeek}</Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.journalCard, { backgroundColor: getMoodColor(journal.avg_rating) }]}
                            onPress={() => navigation.navigate('MoodJournalDetail', { journalId: journal.id })}
                        >
                            <View style={styles.moodRatingContainer}>
                                <Text style={styles.moodEmoji}>{getMoodEmoji(journal.avg_rating)}</Text>
                                <Text style={styles.moodLabel}>{getMoodLabel(journal.avg_rating)}</Text>
                            </View>
                            {journal.symptoms && journal.symptoms.length > 0 && (
                                <View style={styles.symptomsContainer}>
                                    {journal.symptoms.slice(0, 3).map((symptom, index) => (
                                        <View key={index} style={styles.symptomTag}>
                                            <Text style={styles.symptomText}>{symptom}</Text>
                                        </View>
                                    ))}
                                    {journal.symptoms.length > 3 && (
                                        <Text style={styles.moreSymptoms}>+{journal.symptoms.length - 3} more</Text>
                                    )}
                                </View>
                            )}
                            {journal.notes && (
                                <Text style={styles.notesPreview} numberOfLines={2}>
                                    {journal.notes}
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                );
            case 'addEntryPrompt':
                const { date, isCurrentDay: isAddEntryCurrentDay } = item;
                const formattedAddDate = moment(date).format('DD');
                const dayOfWeekAdd = moment(date).format('ddd').toUpperCase();
                return (
                    <View style={styles.dayEntryRow}>
                        <View style={styles.dayDateCard}>
                            <Text style={styles.dayDateText}>{formattedAddDate}</Text>
                            <Text style={styles.dayOfWeekText}>{dayOfWeekAdd}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.addEntryButton}
                            onPress={() => navigation.navigate('CreateMoodJournal', { date: date })}
                        >
                            <Ionicons name="add-circle" size={SPACING.lg} color={COLORS.primaryLight} />
                            <Text style={styles.addEntryButtonText}>Add Entry</Text>
                        </TouchableOpacity>
                    </View>
                );
            case 'unloggedPeriod':
                const startDay = moment(item.startDate).format('DD');
                const startDayOfWeek = moment(item.startDate).format('ddd').toUpperCase();
                const endDay = moment(item.endDate).format('DD');
                const endDayOfWeek = moment(item.endDate).format('ddd').toUpperCase();
                return (
                    <View style={styles.unloggedPeriodRow}>
                        <View style={styles.dayDateCard}>
                            <Text style={styles.dayDateText}>{startDay}</Text>
                            <Text style={styles.dayOfWeekText}>{startDayOfWeek}</Text>
                        </View>
                        <View style={styles.unloggedPeriodMiddle}>
                            <Text style={styles.unloggedPeriodText}>
                                {item.duration} {item.duration === 1 ? 'day' : 'days'} unlogged
                            </Text>
                            <View style={styles.unloggedDotsContainer}>
                                <View style={styles.unloggedDot} />
                                <View style={styles.unloggedLine} />
                                <View style={styles.unloggedDot} />
                            </View>
                            <TouchableOpacity
                                style={styles.addEntryButtonSmall}
                                onPress={() => navigation.navigate('CreateMoodJournal', { date: item.endDate })} // Navigate to add entry for the latest unlogged day
                            >
                                <Ionicons name="add-circle" size={SPACING.md} color={COLORS.primaryLight} />
                                <Text style={styles.addEntryButtonSmallText}>Add Latest</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.dayDateCard}>
                            <Text style={styles.dayDateText}>{endDay}</Text>
                            <Text style={styles.dayOfWeekText}>{endDayOfWeek}</Text>
                        </View>
                    </View>
                );
            default:
                return null;
        }
    };

    const getItemHeight = (item: DailyEntryItem) => {
        switch (item.type) {
            case 'monthHeader': return 60;
            case 'journalEntry': return 180; // Adjusted height for compactness
            case 'addEntryPrompt': return 100;
            case 'unloggedPeriod': return 140; // Adjusted height for compactness
            default: return 0;
        }
    };

    const getItemOffset = (data: DailyEntryItem[], index: number) => {
        let offset = 0;
        for (let i = 0; i < index; i++) {
            offset += getItemHeight(data![i]);
        }
        return offset;
    };


    return (
        <ScreenLayout>
            <View style={styles.header}>
                <BackButton />
                <View style={styles.monthFilterContainer}>
                    <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.monthChangeButton}>
                        <Ionicons name="chevron-back" size={SPACING.lg} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.monthFilterText}>{currentMonthDisplayed.format('MMMMiedenis')}</Text>
                    <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.monthChangeButton}>
                        <Ionicons name="chevron-forward" size={SPACING.lg} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={scrollToCurrentMonth} style={styles.filterIcon}>
                    <Text style={styles.currentMonthButtonText}>{moment().format('YYYY')}</Text>
                </TouchableOpacity>
            </View>

            {/* Statistics Display Area */}
            <View style={styles.statisticsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Current Streak</Text>
                    <Text style={styles.statValue}>{monthStats.streak} days</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Overall Mood</Text>
                    <Text style={styles.statValue}>
                        {monthStats.overallMoodScore > 0 ? monthStats.overallMoodScore.toFixed(1) : 'N/A'}
                    </Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Happy Days</Text>
                    <Text style={styles.statValue}>{monthStats.happyDays}</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Bad Days</Text>
                    <Text style={styles.statValue}>{monthStats.badDays}</Text>
                </View>
                {monthStats.totalEntries > 0 && (
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Neutral Days</Text>
                        <Text style={styles.statValue}>{monthStats.neutralDays}</Text>
                    </View>
                )}
            </View>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={displayItems}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.flatListContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={COLORS.primary}
                        />
                    }
                    getItemLayout={(data, index) => (
                        { length: getItemHeight(data![index]), offset: getItemOffset(data!, index), index }
                    )}
                />
            )}
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        backgroundColor: COLORS.card,
        ...SHADOWS.small,
        borderBottomLeftRadius: RADIUS.lg,
        borderBottomRightRadius: RADIUS.lg,
        marginBottom: SPACING.sm,
    },
    monthFilterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.inputBackground,
        borderRadius: RADIUS.round,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        flexGrow: 1,
        justifyContent: 'center',
        marginHorizontal: SPACING.sm,
    },
    monthFilterText: {
        ...Typography.bodyMedium,
        color: COLORS.textPrimary,
        marginHorizontal: SPACING.sm,
        fontWeight: Typography.bodyMedium.fontWeight,
    },
    monthChangeButton: {
        padding: SPACING.xxs,
    },
    filterIcon: {
        backgroundColor: COLORS.primary,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs - 2,
        ...SHADOWS.small,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    currentMonthButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    flatListContent: {
        paddingHorizontal: SPACING.sm, // Reduced horizontal padding
        paddingBottom: SPACING.xl,
    },
    monthHeaderContainer: {
        alignItems: 'center',
        paddingVertical: SPACING.md,
        marginBottom: SPACING.sm,
    },
    monthHeaderText: {
        ...Typography.h3,
        color: COLORS.textPrimary,
        fontWeight: 'bold',
    },
    dayEntryRow: { // Renamed from dayContainer for clarity
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md, // Reduced margin for compactness
        paddingVertical: SPACING.xxs, // Slight vertical padding for internal spacing
    },
    dayDateCard: {
        backgroundColor: COLORS.card, // Kept background, removed border/shadow
        borderRadius: RADIUS.md,
        width: 60, // Fixed width
        height: 60, // Fixed height
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.sm, // Adjusted margin
        flexShrink: 0,
    },
    dayDateText: {
        ...Typography.h4,
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    dayOfWeekText: {
        ...Typography.caption,
        color: COLORS.textSecondary,
    },
    journalCard: {
        flex: 1,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        ...SHADOWS.small, // Reduced shadow intensity
    },
    moodRatingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    moodEmoji: {
        fontSize: FONTS.size.xl, // Reduced font size
        marginRight: SPACING.sm,
    },
    moodLabel: {
        ...Typography.h3,
        color: COLORS.white,
    },
    symptomsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: SPACING.sm,
    },
    symptomTag: {
        backgroundColor: COLORS.white + '30',
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.round,
        marginRight: SPACING.xs,
        marginBottom: SPACING.xs,
    },
    symptomText: {
        ...Typography.caption,
        color: COLORS.white,
    },
    moreSymptoms: {
        ...Typography.caption,
        color: COLORS.textLight,
        alignSelf: 'center',
        marginLeft: SPACING.xxs,
    },
    notesPreview: {
        ...Typography.bodySmall,
        color: COLORS.white,
        opacity: 0.8,
    },
    addEntryButton: {
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        borderWidth: 1, // Reduced border width
        borderColor: COLORS.primaryLight,
        borderStyle: 'dashed',
        ...SHADOWS.small,
    },
    addEntryButtonText: {
        ...Typography.bodyMedium,
        color: COLORS.primaryLight,
        marginLeft: SPACING.sm,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statisticsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        marginTop: SPACING.md,
        marginHorizontal: SPACING.sm, // Reduced horizontal margin
        marginBottom: SPACING.lg,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        ...SHADOWS.medium,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statCard: {
        backgroundColor: COLORS.background,
        borderRadius: RADIUS.md,
        padding: SPACING.sm,
        alignItems: 'center',
        justifyContent: 'center',
        margin: SPACING.xs,
        width: '45%',
        aspectRatio: 1.2,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.small,
    },
    statLabel: {
        ...Typography.caption,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: SPACING.xxs,
    },
    statValue: {
        ...Typography.h3,
        color: COLORS.primary,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    unloggedPeriodRow: { // Container for the 3-part unlogged period display
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.md, // Reduced margin
        paddingVertical: SPACING.xxs,
        justifyContent: 'space-between',
    },
    unloggedPeriodMiddle: { // The central card for unlogged summary
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.sm, // Reduced padding
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: SPACING.sm, // Space between side date cards and middle card
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.small,
    },
    unloggedPeriodText: {
        ...Typography.bodySmall, // Smaller font for compactness
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
        textAlign: 'center',
    },
    unloggedDotsContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        marginVertical: SPACING.xs, // Adjusted vertical margin
    },
    unloggedDot: {
        width: 6, // Smaller dot
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.textTertiary,
        marginVertical: 1, // Even smaller margin
    },
    unloggedLine: {
        width: 1, // Thinner line
        height: 25, // Slightly shorter line
        backgroundColor: COLORS.textTertiary,
    },
    addEntryButtonSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.md,
        backgroundColor: COLORS.primaryDark,
    },
    addEntryButtonSmallText: {
        ...Typography.caption,
        color: COLORS.white,
        marginLeft: SPACING.xxs,
    }
});

export default MoodJournalListScreen;