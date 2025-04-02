// frontend/src/screens/journal/MoodJournalScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { MoodJournal } from '../../utils/supabase';
import ScreenLayout from "../../components/ScreenLayout";
import BackButton from "../../components/BackButton";

const MoodJournalScreen = () => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [journals, setJournals] = useState<MoodJournal[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchJournals();
        }
    }, [user]);

    const fetchJournals = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('mood_journals')
                .select('*')
                .eq('user_id', user?.id)
                .order('date', { ascending: false });

            if (error) throw error;
            setJournals(data || []);
        } catch (error) {
            console.error('Error fetching journals:', error);
        } finally {
            setLoading(false);
        }
    };

    // Implement the rest of the component...
    return (
        <ScreenLayout>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Mood Journal</Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => navigation.navigate('CreateMoodJournal' as never)}
                        accessibilityLabel="Create new journal entry"
                    >
                        <Ionicons name="add" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {loading ? (
                    <ActivityIndicator size="large" color="#3498db" style={styles.loader} />
                ) : (
                    <FlatList
                        data={journals}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.journalCard}
                                onPress={() => navigation.navigate('MoodJournalDetail', { journalId: item.id } as never)}
                            >
                                <Text style={styles.journalDate}>
                                    {new Date(item.date).toLocaleDateString()}
                                </Text>
                                <View style={styles.moodRow}>
                                    <Text style={styles.moodEmoji}>
                                        {getMoodEmoji(item.mood_rating)}
                                    </Text>
                                    <Text style={styles.moodLabel}>
                                        {getMoodLabel(item.mood_rating)}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>No journal entries yet</Text>
                                <Text style={styles.emptySubtext}>
                                    Tap the + button to create your first entry
                                </Text>
                            </View>
                        }
                        contentContainerStyle={journals.length === 0 ? { flex: 1 } : null}
                    />
                )}
            </View>
        </ScreenLayout>
    );
};

// Helper functions for emojis and labels
const getMoodEmoji = (rating: number) => {
    switch (rating) {
        case 1: return '😞';
        case 2: return '😕';
        case 3: return '😐';
        case 4: return '🙂';
        case 5: return '😄';
        default: return '❓';
    }
};

const getMoodLabel = (rating: number) => {
    switch (rating) {
        case 1: return 'Very Poor';
        case 2: return 'Poor';
        case 3: return 'Neutral';
        case 4: return 'Good';
        case 5: return 'Excellent';
        default: return 'Unknown';
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9FC',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
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
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3498db',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    journalCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        margin: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    journalDate: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    moodRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    moodEmoji: {
        fontSize: 24,
        marginRight: 8,
    },
    moodLabel: {
        fontSize: 16,
        color: '#666',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#7f8c8d',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#95a5a6',
        textAlign: 'center',
    },
});

export default MoodJournalScreen;