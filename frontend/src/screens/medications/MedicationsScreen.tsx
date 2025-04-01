import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ScreenLayout from "../../components/ScreenLayout";

const MedicationsScreen = () => {
    return (
        <ScreenLayout>
            <View style={styles.container}>
                <Text style={styles.title}>Medications</Text>
                <Text style={styles.subtitle}>Coming soon!</Text>
            </View>
        </ScreenLayout>
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

export default MedicationsScreen;