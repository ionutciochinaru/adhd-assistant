import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MoodJournalScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Mood Journal</Text>
            <Text style={styles.subtitle}>Coming soon!</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F7F9FC',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
});

export default MoodJournalScreen;