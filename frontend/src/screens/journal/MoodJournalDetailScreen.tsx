import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { JournalStackParamList } from '../../navigation/JournalNavigator';
import { supabase } from '../../utils/supabase';
import { MoodJournal } from '../../utils/supabase';
import ScreenLayout from '../../components/ScreenLayout';
import BackButton from '../../components/BackButton';
import { COLORS, SPACING, Typography, RADIUS, SHADOWS } from '../../utils/styles';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = StackNavigationProp<JournalStackParamList, 'MoodJournalDetail'>;
type RoutePropType = RouteProp<JournalStackParamList, 'MoodJournalDetail'>;

const MoodJournalDetailScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<RoutePropType>();
    const { journalId } = route.params;

    const [journal, setJournal] = useState<MoodJournal | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJournalEntry();
    }, [journalId]);

    const fetchJournalEntry = async () => {
        try {
            const { data, error } = await supabase
                .from('mood_journals')
                .select('*')
                .eq('id', journalId)
                .single();

            if (error) throw error;
            setJournal(data);
        } catch (error) {
            console.error('Error fetching journal:', error);
            Alert.alert('Error', 'Failed to load journal entry');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Entry',
            'Are you sure you want to delete this journal entry?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const { error } = await supabase
                                .from('mood_journals')
                                .delete()
                                .eq('id', journalId);

                            if (error) throw error;
                            navigation.goBack();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete entry');
                        }
                    }
                }
            ]
        );
    };

    const getEmoji = (rating: number, type: 'mood' | 'focus' | 'energy' | 'sleep') => {
        const emojis = {
            mood: ['😰', '😕', '😐', '🙂', '😄'],
            focus: ['🌫️', '🌁', '🔍', '🎯', '🔬'],
            energy: ['🪫', '🔋', '🔋🔋', '🔋🔋🔋', '⚡'],
            sleep: ['😵', '😴', '😪', '🛌', '💤'],
        };
        return emojis[type][rating - 1] || '❓';
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <ScreenLayout>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </ScreenLayout>
        );
    }

    if (!journal) {
        return (
            <ScreenLayout>
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Journal entry not found</Text>
                </View>
            </ScreenLayout>
        );
    }

    const avgRating = (journal.mood_rating + journal.focus_rating +
        journal.energy_rating + journal.sleep_quality) / 4;

    return (
        <ScreenLayout
            leftComponent={<BackButton onPress={() => navigation.goBack()} />}
            title="Journal Entry"
            rightComponent={
                <TouchableOpacity onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.accent1} />
                </TouchableOpacity>
            }
        >
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.dateCard}>
                    <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.dateText}>{formatDate(journal.date)}</Text>
                </View>

                <View style={styles.overallCard}>
                    <Text style={styles.overallTitle}>Overall Rating</Text>
                    <Text style={styles.overallRating}>{avgRating.toFixed(1)}/5</Text>
                    <View style={styles.overallBar}>
                        <View style={[styles.overallProgress, { width: `${(avgRating / 5) * 100}%` }]} />
                    </View>
                </View>

                <View style={styles.ratingsGrid}>
                    <View style={styles.ratingCard}>
                        <Text style={styles.ratingEmoji}>{getEmoji(journal.mood_rating, 'mood')}</Text>
                        <Text style={styles.ratingTitle}>Mood</Text>
                        <Text style={styles.ratingValue}>{journal.mood_rating}/5</Text>
                    </View>

                    <View style={styles.ratingCard}>
                        <Text style={styles.ratingEmoji}>{getEmoji(journal.focus_rating, 'focus')}</Text>
                        <Text style={styles.ratingTitle}>Focus</Text>
                        <Text style={styles.ratingValue}>{journal.focus_rating}/5</Text>
                    </View>

                    <View style={styles.ratingCard}>
                        <Text style={styles.ratingEmoji}>{getEmoji(journal.energy_rating, 'energy')}</Text>
                        <Text style={styles.ratingTitle}>Energy</Text>
                        <Text style={styles.ratingValue}>{journal.energy_rating}/5</Text>
                    </View>

                    <View style={styles.ratingCard}>
                        <Text style={styles.ratingEmoji}>{getEmoji(journal.sleep_quality, 'sleep')}</Text>
                        <Text style={styles.ratingTitle}>Sleep</Text>
                        <Text style={styles.ratingValue}>{journal.sleep_quality}/5</Text>
                    </View>
                </View>

                {journal.symptoms && journal.symptoms.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Symptoms Experienced</Text>
                        <View style={styles.symptomsGrid}>
                            {journal.symptoms.map((symptom, index) => (
                                <View key={index} style={styles.symptomTag}>
                                    <Text style={styles.symptomText}>{symptom}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {journal.notes && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Notes</Text>
                        <View style={styles.notesCard}>
                            <Text style={styles.notesText}>{journal.notes}</Text>
                        </View>
                    </View>
                )}

                <View style={styles.insightsSection}>
                    <Text style={styles.sectionTitle}>Insights</Text>

                    <View style={styles.insightCard}>
                        <View style={styles.insightIcon}>
                            <Ionicons name="trending-up-outline" size={20} color={COLORS.accent3} />
                        </View>
                        <View style={styles.insightContent}>
                            <Text style={styles.insightTitle}>Mood Pattern</Text>
                            <Text style={styles.insightText}>
                                {journal.mood_rating >= 4 ? 'Great mood today!' :
                                    journal.mood_rating >= 3 ? 'Stable mood' :
                                        'Consider what might have affected your mood'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.insightCard}>
                        <View style={styles.insightIcon}>
                            <Ionicons name="analytics-outline" size={20} color={COLORS.primary} />
                        </View>
                        <View style={styles.insightContent}>
                            <Text style={styles.insightTitle}>Focus Correlation</Text>
                            <Text style={styles.insightText}>
                                {journal.sleep_quality >= 4 && journal.focus_rating >= 4
                                    ? 'Good sleep seems to improve your focus!'
                                    : 'Track more entries to see patterns'}
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        ...Typography.bodyMedium,
        color: COLORS.textSecondary,
    },
    dateCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        padding: SPACING.md,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.md,
        borderRadius: RADIUS.lg,
        ...SHADOWS.small,
    },
    dateText: {
        ...Typography.bodyMedium,
        color: COLORS.textPrimary,
        marginLeft: SPACING.sm,
    },
    overallCard: {
        backgroundColor: COLORS.card,
        padding: SPACING.lg,
        marginHorizontal: SPACING.md,
        marginTop: SPACING.md,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        ...SHADOWS.small,
    },
    overallTitle: {
        ...Typography.bodyMedium,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    overallRating: {
        ...Typography.h1,
        color: COLORS.primary,
        marginBottom: SPACING.sm,
    },
    overallBar: {
        width: '100%',
        height: 8,
        backgroundColor: COLORS.cardShadow,
        borderRadius: RADIUS.round,
        overflow: 'hidden',
    },
    overallProgress: {
        height: '100%',
        backgroundColor: COLORS.primary,
    },
    ratingsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: SPACING.md,
        marginTop: SPACING.md,
    },
    ratingCard: {
        width: '50%',
        padding: SPACING.xs,
    },
    ratingCardInner: {
        backgroundColor: COLORS.card,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        ...SHADOWS.small,
    },
    ratingEmoji: {
        fontSize: 32,
        marginBottom: SPACING.xs,
    },
    ratingTitle: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    ratingValue: {
        ...Typography.h4,
        color: COLORS.textPrimary,
    },
    section: {
        marginTop: SPACING.lg,
        paddingHorizontal: SPACING.md,
    },
    sectionTitle: {
        ...Typography.h4,
        color: COLORS.textPrimary,
        marginBottom: SPACING.md,
    },
    symptomsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -SPACING.xs,
    },
    symptomTag: {
        backgroundColor: COLORS.card,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: RADIUS.round,
        margin: SPACING.xs,
        ...SHADOWS.small,
    },
    symptomText: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
    },
    notesCard: {
        backgroundColor: COLORS.card,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        ...SHADOWS.small,
    },
    notesText: {
        ...Typography.bodyMedium,
        color: COLORS.textPrimary,
        lineHeight: 24,
    },
    insightsSection: {
        marginTop: SPACING.lg,
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.xl,
    },
    insightCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        padding: SPACING.md,
        borderRadius: RADIUS.lg,
        marginBottom: SPACING.sm,
        ...SHADOWS.small,
    },
    insightIcon: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.round,
        backgroundColor: COLORS.cardShadow,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    insightContent: {
        flex: 1,
    },
    insightTitle: {
        ...Typography.bodyMedium,
        color: COLORS.textPrimary,
        fontWeight: '600',
        marginBottom: SPACING.xs,
    },
    insightText: {
        ...Typography.bodySmall,
        color: COLORS.textSecondary,
    },
});

export default MoodJournalDetailScreen;