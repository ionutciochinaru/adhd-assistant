import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import CreateMoodJournalScreen from '../screens/journal/CreateMoodJournalScreen';
import MoodJournalDetailScreen from '../screens/journal/MoodJournalDetailScreen';
import MoodJournalListScreen from '../screens/journal/MoodJournalListScreen';

export type JournalStackParamList = {
    MoodJournalList: undefined;
    CreateMoodJournal: { date?: string };
    MoodJournalDetail: { journalId: string };
};

const Stack = createStackNavigator<JournalStackParamList>();

const JournalNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen
                name="MoodJournalList"
                component={MoodJournalListScreen}
            />
            <Stack.Screen
                name="CreateMoodJournal"
                component={CreateMoodJournalScreen}
            />
            <Stack.Screen
                name="MoodJournalDetail"
                component={MoodJournalDetailScreen}
            />
        </Stack.Navigator>
    );
};

export default JournalNavigator;