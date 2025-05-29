import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Alert, // Import Alert for error messages
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { JournalStackParamList } from '../../navigation/JournalNavigator';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { MoodJournal } from '../../utils/supabase'; // Assuming MoodJournal type is correctly imported
import ScreenLayout from '../../components/ScreenLayout';
import { COLORS, SPACING, Typography, RADIUS, SHADOWS, MOOD_COLOR_MAP, MOOD_EMOJI_MAP, FONTS } from '../../utils/styles';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import BackButton from '../../components/BackButton'; // Ensure BackButton is imported

type NavigationProp = StackNavigationProp<JournalStackParamList, 'MoodJournalList'>;

// Extend MoodJournal to include the calculated avg_rating
interface ExtendedMoodJournal extends MoodJournal {
    avg_rating?: number; // Make it optional since it's calculated after fetch
}

interface DailyJournalEntry {
    date: string; // YYYY-MM-DD format
    journal?: ExtendedMoodJournal;
    isCurrentDay: boolean;
    canAddEntry: boolean; // True if it's today or one of the last 5 days with no entry
}

const MoodJournalListScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const { user } = useAuth();
    const [journalsMap, setJournalsMap] = useState<Map<string, ExtendedMoodJournal>>(new Map());
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentMonthDisplayed, setCurrentMonthDisplayed] = useState(moment()); // For the month filter in the header

    // Helper to calculate avg_rating for a journal entry
    const calculateAvgRating = (journal: MoodJournal): number => {
        const { mood_rating, focus_rating, energy_rating, sleep_quality } = journal;
        const sum = mood_rating + focus_rating + energy_rating + sleep_quality;
        return parseFloat((sum / 4).toFixed(1)); // Average of 4 ratings, rounded to 1 decimal
    };

    // Helper to get mood color based on rating
    const getMoodColor = (rating: number | undefined) => {
        if (rating === undefined || rating < 1) return COLORS.card; // Default for no rating or invalid
        // Map average rating to one of the 5 mood levels
        const moodLevel = Math.round(rating); // Round to nearest integer (1-5)
        return MOOD_COLOR_MAP[moodLevel as keyof typeof MOOD_COLOR_MAP];
    };

    // Helper to get mood emoji based on rating
    const getMoodEmoji = (rating: number | undefined) => {
        if (rating === undefined || rating < 1) return '❓'; // Default emoji
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


    // Helper to format date for display
    const formatDateForDisplay = (dateString: string) => {
        const date = moment(dateString);
        return date.format('ddd, MMM D'); // e.g., "Thu, May 29"
    };

    // Helper to format date for comparison (YYYY-MM-DD)
    const formatDateForComparison = (date: moment.Moment) => date.format('YYYY-MM-DD');

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
                // Calculate avg_rating before storing
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

    // Generate daily entries for display
    const generateDailyEntries = () => {
        const dailyEntries: DailyJournalEntry[] = [];
        const today = moment().startOf('day');
        const NUM_DAYS_TO_DISPLAY = 60; // Display last 60 days for scrollability

        for (let i = 0; i < NUM_DAYS_TO_DISPLAY; i++) {
            const date = today.subtract(i, 'day');
            const dateKey = formatDateForComparison(date);
            const journal = journalsMap.get(dateKey);
            const isCurrentDay = date.isSame(today, 'day');
            const daysAgo = today.diff(date, 'day'); // 0 for today, 1 for yesterday, etc.
            const isWithinAddEntryRange = daysAgo <= 5; // Today (0) + 5 days in the past (1 to 5)

            dailyEntries.push({
                date: dateKey,
                journal: journal,
                isCurrentDay: isCurrentDay,
                canAddEntry: isWithinAddEntryRange && !journal,
            });
        }
        return dailyEntries;
    };

    const dailyEntries = generateDailyEntries();

    const renderMoodJournalItem = ({ item }: { item: DailyJournalEntry }) => {
        const { date, journal, isCurrentDay, canAddEntry } = item;
        const formattedDate = formatDateForDisplay(date);
        const dateObj = moment(date);
        const todayObj = moment().startOf('day');
        const daysAgo = todayObj.diff(dateObj, 'day');

        // Determine if this day should highlight as an empty day (for the last 4 days excluding today)
        const isEmptyAndInPastFourDays = !journal && !isCurrentDay && daysAgo >= 1 && daysAgo <= 4;

        return (
            <View style={[
                styles.dayContainer,
                isEmptyAndInPastFourDays && styles.emptyDayHighlight // Highlight for empty days in the last 4 days (not including today)
            ]}>
                {/* Date header */}
                <View style={styles.dateHeader}>
                    <Text style={styles.dateText}>{formattedDate}</Text>
                    {isCurrentDay && <Text style={styles.todayLabel}>Today</Text>}
                </View>

                {/* Journal Card or Add Entry Button */}
                {journal ? (
                    <TouchableOpacity
                        style={[styles.journalCard, { backgroundColor: getMoodColor(journal.avg_rating) }]}
                        onPress={() => navigation.navigate('MoodJournalDetail', { journalId: journal.id })}
                    >
                        <View style={styles.moodRatingContainer}>
                            <Text style={styles.moodEmoji}>{getMoodEmoji(journal.avg_rating)}</Text>
                            {/* Use getMoodLabel for the label */}
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
                ) : (
                    canAddEntry ? (
                        <TouchableOpacity
                            style={styles.addEntryButton}
                            onPress={() => navigation.navigate('CreateMoodJournal', { date: date })}
                        >
                            <Ionicons name="add-circle" size={SPACING.lg} color={COLORS.primaryLight} />
                            <Text style={styles.addEntryButtonText}>Add Entry</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.emptyCard}>
                            <Text style={styles.emptyCardText}>No entry for this day</Text>
                        </View>
                    )
                )}
            </View>
        );
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
        if (direction === 'prev') {
            setCurrentMonthDisplayed(currentMonthDisplayed.subtract(1, 'month'));
        } else {
            setCurrentMonthDisplayed(currentMonthDisplayed.add(1, 'month'));
        }
    };

    const scrollToCurrentMonth = useCallback(() => {
        setCurrentMonthDisplayed(moment());
    }, []);

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

        // Calculate streak starting from today/last day of month backwards
        let dayToCheck = moment();
        if (!currentMonthDisplayed.isSame(moment(), 'month')) {
            dayToCheck = moment(monthEnd); // If viewing a past month, calculate streak up to its end
        }

        // Ensure dayToCheck doesn't go beyond the current date in real time
        if (dayToCheck.isAfter(moment())) {
            dayToCheck = moment();
        }

        while (dayToCheck.isSameOrBefore(moment()) && dayToCheck.isSameOrAfter(monthStart)) {
            const dateKey = dayToCheck.format('YYYY-MM-DD');
            if (journalsMap.has(dateKey)) {
                currentStreak++;
            } else {
                // Only break streak if the missing entry is for today or a past day
                if (dayToCheck.isSameOrBefore(moment(), 'day')) {
                    break;
                }
            }
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


    return (
        <ScreenLayout>
            <View style={styles.header}>
                <BackButton />
                <View style={styles.monthFilterContainer}>
                    <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.monthChangeButton}>
                        <Ionicons name="chevron-back" size={SPACING.lg} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.monthFilterText}>{currentMonthDisplayed.format('MMMM YYYY')}</Text>
                    <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.monthChangeButton}>
                        <Ionicons name="chevron-forward" size={SPACING.lg} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => scrollToCurrentMonth()} style={styles.filterIcon}>
                    <Ionicons name="calendar-outline" size={SPACING.xl} color={COLORS.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Statistics Display Area - Replaces the MonthStripCalendar */}
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
                    data={dailyEntries}
                    renderItem={renderMoodJournalItem}
                    keyExtractor={(item) => item.date}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.flatListContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={COLORS.primary}
                        />
                    }
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
        paddingVertical: SPACING.sm, // Make header a bit slimmer
        backgroundColor: COLORS.card,
        ...SHADOWS.small,
        borderBottomLeftRadius: RADIUS.lg,
        borderBottomRightRadius: RADIUS.lg,
        marginBottom: SPACING.sm, // Add some margin below the header
    },
    monthFilterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.inputBackground, // Slim background for filter
        borderRadius: RADIUS.round,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        flexGrow: 1, // Allow it to take available space
        justifyContent: 'center',
        marginHorizontal: SPACING.sm,
    },
    monthFilterText: {
        ...Typography.bodyMedium,
        color: COLORS.textPrimary,
        marginHorizontal: SPACING.sm,
        fontWeight: Typography.bodyMedium.fontWeight, // Explicitly set fontWeight from Typography
    },
    monthChangeButton: {
        padding: SPACING.xxs,
    },
    filterIcon: {
        // This is now the "Go to current month" button
    },
    flatListContent: {
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.xl, // Ensure space for the FAB or bottom content
    },
    dayContainer: {
        marginBottom: SPACING.lg, // Space between each day's entry
        paddingVertical: SPACING.sm,
    },
    emptyDayHighlight: {
        // This is the style to make it "super easy to find the days you did not add anything"
        backgroundColor: COLORS.cardShadow, // A slightly darker background
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        // Add subtle shadow or border for emphasis
        ...SHADOWS.small,
    },
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
        paddingHorizontal: SPACING.xs, // Align with card padding
    },
    dateText: {
        ...Typography.h4,
        color: COLORS.textPrimary,
        marginRight: SPACING.sm,
    },
    todayLabel: {
        ...Typography.captionBold,
        color: COLORS.primaryLight,
        backgroundColor: COLORS.primaryDark,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.round,
    },
    journalCard: {
        // backgroundColor will be overridden by mood color
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        ...SHADOWS.medium, // More prominent shadow for actual entries
    },
    moodRatingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    moodEmoji: {
        fontSize: FONTS.size.xxl,
        marginRight: SPACING.sm,
    },
    moodLabel: {
        ...Typography.h3,
        color: COLORS.white, // Text color for mood label, always white on colored background
    },
    symptomsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: SPACING.sm,
    },
    symptomTag: {
        backgroundColor: COLORS.white + '30', // Semi-transparent white tag
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xxs,
        borderRadius: RADIUS.round,
        marginRight: SPACING.xs,
        marginBottom: SPACING.xs,
    },
    symptomText: {
        ...Typography.caption,
        color: COLORS.white, // Symptom text on colored card should be white
    },
    moreSymptoms: {
        ...Typography.caption,
        color: COLORS.textLight,
        alignSelf: 'center',
        marginLeft: SPACING.xxs,
    },
    notesPreview: {
        ...Typography.bodySmall,
        color: COLORS.white, // Notes text on colored card should be white
        opacity: 0.8,
    },
    addEntryButton: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        borderWidth: 2,
        borderColor: COLORS.primaryLight, // Highlight border
        borderStyle: 'dashed', // Dashed border for empty state
        ...SHADOWS.small,
    },
    addEntryButtonText: {
        ...Typography.bodyMedium,
        color: COLORS.primaryLight,
        marginLeft: SPACING.sm,
    },
    emptyCard: {
        backgroundColor: COLORS.card,
        borderRadius: RADIUS.lg,
        padding: SPACING.md,
        alignItems: 'center',
        justifyContent: 'center',
        height: 100, // Fixed height for visual consistency
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.small,
    },
    emptyCardText: {
        ...Typography.bodySmall,
        color: COLORS.textTertiary,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // New styles for statistics container and cards
    statisticsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        marginTop: SPACING.md,
        marginHorizontal: SPACING.md, // Match screen padding
        marginBottom: SPACING.lg, // Space below stats
        backgroundColor: COLORS.card, // Background for the stats block
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
        width: '45%', // Two cards per row
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
        color: COLORS.primary, // Use primary color for values
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default MoodJournalListScreen;