// frontend/src/screens/journal/CreateMoodJournalScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackScreenProps } from '@react-navigation/stack';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import ScreenLayout from "../../components/ScreenLayout";

// Navigation types
type JournalStackParamList = {
    MoodJournal: undefined;
    CreateMoodJournal: undefined;
    MoodJournalDetail: { journalId: string };
};

type Props = StackScreenProps<JournalStackParamList, 'CreateMoodJournal'>;

// Common ADHD symptoms
const COMMON_SYMPTOMS = [
    'Distractibility',
    'Hyperfocus',
    'Forgetfulness',
    'Procrastination',
    'Impulsivity',
    'Restlessness',
    'Disorganization',
    'Time blindness',
    'Emotional dysregulation',
    'Executive dysfunction',
    'Rejection sensitivity',
    'Anxiety',
    'Mental fatigue',
    'Physical fatigue',
    'Insomnia',
];

const CreateMoodJournalScreen = ({ navigation }: Props) => {
    const { user } = useAuth();
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [moodRating, setMoodRating] = useState<number>(3);
    const [focusRating, setFocusRating] = useState<number>(3);
    const [energyRating, setEnergyRating] = useState<number>(3);
    const [sleepQuality, setSleepQuality] = useState<number>(3);
    const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    // Function to toggle symptom selection
    const toggleSymptom = (symptom: string) => {
        if (selectedSymptoms.includes(symptom)) {
            setSelectedSymptoms(selectedSymptoms.filter(s => s !== symptom));
        } else {
            setSelectedSymptoms([...selectedSymptoms, symptom]);
        }
    };

    // Function to handle date selection
    const handleDateConfirm = (selectedDate: Date) => {
        setShowDatePicker(false);
        setDate(selectedDate);
    };

    // Function to save journal entry
    const saveJournal = async () => {
        try {
            setLoading(true);

            // Format date to YYYY-MM-DD
            const formattedDate = date.toISOString().split('T')[0];

            // Check if entry for this date already exists
            const { data: existingEntries, error: checkError } = await supabase
                .from('mood_journals')
                .select('id')
                .eq('user_id', user?.id)
                .eq('date', formattedDate);

            if (checkError) throw checkError;

            if (existingEntries && existingEntries.length > 0) {
                Alert.alert(
                    'Entry Already Exists',
                    'You already have a journal entry for this date. Would you like to overwrite it?',
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
                        {
                            text: 'Overwrite',
                            style: 'destructive',
                            onPress: async () => {
                                await updateExistingEntry(existingEntries[0].id, formattedDate);
                            }
                        }
                    ]
                );
                return;
            }

            // Create new entry
            await createNewEntry(formattedDate);

        } catch (error: any) {
            console.error('Error saving journal:', error.message);
            Alert.alert('Error', 'Failed to save journal entry');
            setLoading(false);
        }
    };

    // Create a new journal entry
    const createNewEntry = async (formattedDate: string) => {
        try {
            const { data, error } = await supabase
                .from('mood_journals')
                .insert({
                    user_id: user?.id,
                    date: formattedDate,
                    mood_rating: moodRating,
                    focus_rating: focusRating,
                    energy_rating: energyRating,
                    sleep_quality: sleepQuality,
                    symptoms: selectedSymptoms,
                    notes: notes.trim() || null
                })
                .select()
                .single();

            if (error) throw error;

            setLoading(false);
            Alert.alert('Success', 'Journal entry saved successfully');
            navigation.goBack();
        } catch (error: any) {
            console.error('Error creating entry:', error.message);
            Alert.alert('Error', 'Failed to create journal entry');
            setLoading(false);
        }
    };

    // Update an existing journal entry
    const updateExistingEntry = async (entryId: string, formattedDate: string) => {
        try {
            const { error } = await supabase
                .from('mood_journals')
                .update({
                    date: formattedDate,
                    mood_rating: moodRating,
                    focus_rating: focusRating,
                    energy_rating: energyRating,
                    sleep_quality: sleepQuality,
                    symptoms: selectedSymptoms,
                    notes: notes.trim() || null
                })
                .eq('id', entryId);

            if (error) throw error;

            setLoading(false);
            Alert.alert('Success', 'Journal entry updated successfully');
            navigation.goBack();
        } catch (error: any) {
            console.error('Error updating entry:', error.message);
            Alert.alert('Error', 'Failed to update journal entry');
            setLoading(false);
        }
    };

    // Render rating selection component
    const RatingSelector = ({
                                value,
                                onChange,
                                title,
                                emojis = ['😞', '😕', '😐', '🙂', '😄']
                            }: {
        value: number;
        onChange: (val: number) => void;
        title: string;
        emojis?: string[];
    }) => (
        <View style={styles.ratingContainer}>
            <Text style={styles.ratingTitle}>{title}</Text>
            <View style={styles.ratingButtons}>
                {[1, 2, 3, 4, 5].map((rating) => (
                    <TouchableOpacity
                        key={rating}
                        style={[
                            styles.ratingButton,
                            value === rating && styles.selectedRatingButton
                        ]}
                        onPress={() => onChange(rating)}
                    >
                        <Text style={styles.ratingEmoji}>{emojis[rating - 1]}</Text>
                        <Text style={[
                            styles.ratingText,
                            value === rating && styles.selectedRatingText
                        ]}>
                            {rating}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    return (
        <ScreenLayout>
            <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => navigation.goBack()}
                    disabled={loading}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Journal Entry</Text>
                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={saveJournal}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
                <View style={styles.dateContainer}>
                    <Text style={styles.sectionTitle}>Date</Text>
                    <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={styles.dateButtonText}>
                            {date.toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </Text>
                        <Ionicons name="calendar-outline" size={20} color="#7F8C8D" />
                    </TouchableOpacity>

                    <DateTimePickerModal
                        isVisible={showDatePicker}
                        mode="date"
                        onConfirm={handleDateConfirm}
                        onCancel={() => setShowDatePicker(false)}
                        date={date}
                        maximumDate={new Date()}
                    />
                </View>

                <View style={styles.section}>
                    <RatingSelector
                        title="How was your mood today?"
                        value={moodRating}
                        onChange={setMoodRating}
                        emojis={['😞', '😕', '😐', '🙂', '😄']}
                    />

                    <RatingSelector
                        title="How was your focus?"
                        value={focusRating}
                        onChange={setFocusRating}
                        emojis={['🌫️', '🌁', '🔍', '🔎', '🔭']}
                    />

                    <RatingSelector
                        title="How was your energy level?"
                        value={energyRating}
                        onChange={setEnergyRating}
                        emojis={['🔋', '🔋🔋', '🔋🔋🔋', '🔋🔋🔋🔋', '🔋🔋🔋🔋🔋']}
                    />

                    <RatingSelector
                        title="How well did you sleep?"
                        value={sleepQuality}
                        onChange={setSleepQuality}
                        emojis={['😴💔', '😴👎', '😴👌', '😴👍', '😴💯']}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ADHD Symptoms Experienced</Text>
                    <Text style={styles.sectionSubtitle}>Select all that apply today</Text>

                    <View style={styles.symptomsGrid}>
                        {COMMON_SYMPTOMS.map((symptom) => (
                            <TouchableOpacity
                                key={symptom}
                                style={[
                                    styles.symptomTag,
                                    selectedSymptoms.includes(symptom) && styles.selectedSymptomTag
                                ]}
                                onPress={() => toggleSymptom(symptom)}
                            >
                                <Text style={[
                                    styles.symptomText,
                                    selectedSymptoms.includes(symptom) && styles.selectedSymptomText
                                ]}>
                                    {symptom}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    <TextInput
                        style={styles.notesInput}
                        placeholder="Add any additional notes or observations..."
                        value={notes}
                        onChangeText={setNotes}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                    />
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
    cancelButton: {
        paddingHorizontal: 8,
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#7F8C8D',
    },
    saveButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#3498DB',
        borderRadius: 6,
    },
    saveButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
    },
    dateContainer: {
        marginBottom: 16,
    },
    dateButton: {
        backgroundColor: '#FFFFFF',
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    dateButtonText: {
        fontSize: 16,
        color: '#2C3E50',
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#7F8C8D',
        marginBottom: 16,
    },
    ratingContainer: {
        marginBottom: 20,
    },
    ratingTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2C3E50',
        marginBottom: 12,
    },
    ratingButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    ratingButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        marginHorizontal: 4,
        backgroundColor: '#F5F5F5',
    },
    selectedRatingButton: {
        backgroundColor: '#3498DB',
    },
    ratingEmoji: {
        fontSize: 24,
        marginBottom: 4,
    },
    ratingText: {
        fontSize: 14,
        color: '#7F8C8D',
    },
    selectedRatingText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    symptomsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    symptomTag: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        margin: 4,
    },
    selectedSymptomTag: {
        backgroundColor: '#3498DB',
    },
    symptomText: {
        fontSize: 14,
        color: '#7F8C8D',
    },
    selectedSymptomText: {
        color: '#FFFFFF',
    },
    notesInput: {
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        height: 120,
        backgroundColor: '#FFFFFF',
    },
});

export default CreateMoodJournalScreen;