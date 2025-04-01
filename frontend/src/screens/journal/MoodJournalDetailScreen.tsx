// frontend/src/screens/journal/MoodJournalDetailScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { MoodJournal } from '../../utils/supabase';
import ScreenLayout from "../../components/ScreenLayout";

// Navigation types
type JournalStackParamList = {
    MoodJournal: undefined;
    CreateMoodJournal: undefined;
    MoodJournalDetail: { journalId: string };
};

type Props = StackScreenProps<JournalStackParamList, 'MoodJournalDetail'>;

const MoodJournalDetailScreen = ({ route, navigation }: Props) => {
    const { journalId } = route.params;
    const { user } = useAuth();
    const [journal, setJournal] = useState<MoodJournal | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadJournal();
    }, [journalId]);

    const loadJournal = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('mood_journals')
                .select('*')
                .eq('id', journalId)
                .eq('user_id', user?.id)
                .single();

            if (error) throw error;

            setJournal(data);
        } catch (error: any) {
            console.error('Error loading journal:', error.message);
            Alert.alert('Error', 'Failed to load journal entry');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const deleteJournal = async () => {
        Alert.alert(
            'Delete Journal Entry',
            'Are you sure you want to delete this journal entry? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);

                            const { error } = await supabase
                                .from('mood_journals')
                                .delete()
                                .eq('id', journalId);

                            if (error) throw error;

                            navigation.goBack();
                        } catch (error: any) {
                            console.error('Error deleting journal:', error.message);
                            Alert.alert('Error', 'Failed to delete journal entry');
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const navigateToEdit = () => {
        // Navigate to edit screen with the journal data
        // This would be implemented when you create the edit screen
        Alert.alert('Coming Soon', 'Edit functionality will be added soon!');
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3498DB" />
            </View>
        );
    }

    if (!journal) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Journal entry not found</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Format date for display
    const journalDate = new Date(journal.date);
    const formattedDate = journalDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    // Helper functions to render rating emojis
    const renderMoodEmoji = (rating: number) => {
        switch (rating) {
            case 1: return '😞';
            case 2: return '😕';
            case 3: return '😐';
            case 4: return '🙂';
            case 5: return '😄';
            default: return '❓';
        }
    };

    const renderFocusEmoji = (rating: number) => {
        switch (rating) {
            case 1: return '🌫️';
            case 2: return '🌁';
            case 3: return '🔍';
            case 4: return '🔎';
            case 5: return '🔭';
            default: return '❓';
        }
    };

    const renderEnergyEmoji = (rating: number) => {
        switch (rating) {
            case 1: return '🔋';
            case 2: return '🔋🔋';
            case 3: return '🔋🔋🔋';
            case 4: return '🔋🔋🔋🔋';
            case 5: return '🔋🔋🔋🔋🔋';
            default: return '❓';
        }
    };

    const renderSleepEmoji = (rating: number) => {
        switch (rating) {
            case 1: return '😴💔';
            case 2: return '😴👎';
            case 3: return '😴👌';
            case 4: return '😴👍';
            case 5: return '😴💯';
            default: return '❓';
        }
    };

    // Helper function to render rating description
    const getRatingDescription = (type: string, rating: number) => {
        const descriptions = {
            mood: ['Very Poor', 'Poor', 'Neutral', 'Good', 'Excellent'],
            focus: ['Very Distracted', 'Distracted', 'Average', 'Focused', 'Very Focused'],
            energy: ['Very Low', 'Low', 'Moderate', 'High', 'Very High'],
            sleep: ['Very Poor', 'Poor', 'Average', 'Good', 'Excellent']
        };

        const category = type as keyof typeof descriptions;
        return descriptions[category][rating - 1];
    };

    return (
        <ScreenLayout>
            <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#3498DB" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Journal Entry</Text>
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={navigateToEdit}
                    >
                        <Ionicons name="create-outline" size={24} color="#3498DB" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={deleteJournal}
                    >
                        <Ionicons name="trash-outline" size={24} color="#E74C3C" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.scrollView}>
                <View style={styles.dateContainer}>
                    <Text style={styles.dateText}>{formattedDate}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>My Ratings</Text>

                    <View style={styles.ratingItem}>
                        <View style={styles.ratingHeader}>
                            <Text style={styles.ratingTitle}>Mood</Text>
                            <Text style={styles.ratingEmoji}>{renderMoodEmoji(journal.mood_rating)}</Text>
                        </View>
                        <View style={styles.ratingBar}>
                            <View
                                style={[
                                    styles.ratingFill,
                                    { width: `${journal.mood_rating * 20}%` },
                                    styles.moodColor
                                ]}
                            />
                        </View>
                        <Text style={styles.ratingDescription}>
                            {getRatingDescription('mood', journal.mood_rating)}
                        </Text>
                    </View>

                    <View style={styles.ratingItem}>
                        <View style={styles.ratingHeader}>
                            <Text style={styles.ratingTitle}>Focus</Text>
                            <Text style={styles.ratingEmoji}>{renderFocusEmoji(journal.focus_rating)}</Text>
                        </View>
                        <View style={styles.ratingBar}>
                            <View
                                style={[
                                    styles.ratingFill,
                                    { width: `${journal.focus_rating * 20}%` },
                                    styles.focusColor
                                ]}
                            />
                        </View>
                        <Text style={styles.ratingDescription}>
                            {getRatingDescription('focus', journal.focus_rating)}
                        </Text>
                    </View>

                    <View style={styles.ratingItem}>
                        <View style={styles.ratingHeader}>
                            <Text style={styles.ratingTitle}>Energy</Text>
                            <Text style={styles.ratingEmoji}>{renderEnergyEmoji(journal.energy_rating)}</Text>
                        </View>
                        <View style={styles.ratingBar}>
                            <View
                                style={[
                                    styles.ratingFill,
                                    { width: `${journal.energy_rating * 20}%` },
                                    styles.energyColor
                                ]}
                            />
                        </View>
                        <Text style={styles.ratingDescription}>
                            {getRatingDescription('energy', journal.energy_rating)}
                        </Text>
                    </View>

                    <View style={styles.ratingItem}>
                        <View style={styles.ratingHeader}>
                            <Text style={styles.ratingTitle}>Sleep Quality</Text>
                            <Text style={styles.ratingEmoji}>{renderSleepEmoji(journal.sleep_quality)}</Text>
                        </View>
                        <View style={styles.ratingBar}>
                            <View
                                style={[
                                    styles.ratingFill,
                                    { width: `${journal.sleep_quality * 20}%` },
                                    styles.sleepColor
                                ]}
                            />
                        </View>
                        <Text style={styles.ratingDescription}>
                            {getRatingDescription('sleep', journal.sleep_quality)}
                        </Text>
                    </View>
                </View>

                {journal.symptoms && journal.symptoms.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>ADHD Symptoms</Text>
                        <View style={styles.symptomsContainer}>
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
                        <Text style={styles.notesText}>{journal.notes}</Text>
                    </View>
                )}

                <View style={styles.insightsSection}>
                    <Text style={styles.sectionTitle}>Insights</Text>
                    <Text style={styles.insightsText}>
                        Based on your entries, you tend to have better focus when your mood is positive.
                        Try to incorporate more activities that boost your mood to improve overall well-being.
                    </Text>
                </View>
            </ScrollView>
        </View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9FC',
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
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        color: '#E74C3C',
        marginBottom: 16,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: '#3498DB',
        fontSize: 16,
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2C3E50',
    },
    actionsContainer: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 8,
        marginLeft: 8,
    },
    scrollView: {
        flex: 1,
    },
    dateContainer: {
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 20,
        alignItems: 'center',
        marginBottom: 10,
    },
    dateText: {
        fontSize: 18,
        fontWeight: '500',
        color: '#2C3E50',
    },
    section: {
        backgroundColor: '#FFFFFF',
        marginHorizontal: 12,
        marginVertical: 8,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 16,
    },
    ratingItem: {
        marginBottom: 16,
    },
    ratingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    ratingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2C3E50',
    },
    ratingEmoji: {
        fontSize: 20,
    },
    ratingBar: {
        height: 10,
        backgroundColor: '#EAEAEA',
        borderRadius: 5,
        marginVertical: 8,
    },
    ratingFill: {
        height: '100%',
        borderRadius: 5,
    },
    moodColor: {
        backgroundColor: '#3498DB',
    },
    focusColor: {
        backgroundColor: '#9B59B6',
    },
    energyColor: {
        backgroundColor: '#F39C12',
    },
    sleepColor: {
        backgroundColor: '#1ABC9C',
    },
    ratingDescription: {
        fontSize: 14,
        fontWeight: '400',
        color: '#7F8C8D',
        textAlign: 'right',
    },
    symptomsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    symptomTag: {
        backgroundColor: '#E8F4FD',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
    },
    symptomText: {
        color: '#3498DB',
        fontSize: 14,
    },
    notesText: {
        fontSize: 16,
        color: '#2C3E50',
        lineHeight: 24,
    },
    insightsSection: {
        backgroundColor: '#FDF2E9',
        marginHorizontal: 12,
        marginVertical: 8,
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    insightsText: {
        fontSize: 15,
        color: '#E67E22',
        lineHeight: 22,
    }
});