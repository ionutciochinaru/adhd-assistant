// frontend/src/screens/medications/MedicationsScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import { Medication } from '../../utils/supabase';
import ScreenLayout from "../../components/ScreenLayout";
import {COLORS} from "../../utils/styles";

const MedicationsScreen = () => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const [medications, setMedications] = useState<Medication[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            fetchMedications();
        }
    }, [user]);

    const fetchMedications = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('medications')
                .select('*')
                .eq('user_id', user?.id)
                .order('name');

            if (error) throw error;
            setMedications(data || []);
        } catch (error) {
            console.error('Error fetching medications:', error);
            Alert.alert('Error', 'Failed to load medications');
        } finally {
            setLoading(false);
        }
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="medical" size={64} color="#bdc3c7" />
            <Text style={styles.emptyTitle}>No medications found</Text>
            <Text style={styles.emptySubtitle}>
                Tap the + button to add your first medication
            </Text>
        </View>
    );

    const renderAddButton = () => (
        <TouchableOpacity
            style={styles.addButton}
            onPress={() => Alert.alert('Coming Soon', 'Add medication functionality will be available soon!')}
        >
            <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
    );

    return (
        <ScreenLayout
            title="Medications"
            rightComponent={renderAddButton()}
        >
            <View style={styles.container}>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={medications}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.medicationItem}
                                onPress={() => Alert.alert('Coming Soon', 'Medication details will be available soon!')}
                            >
                                <View style={styles.medicationInfo}>
                                    <Text style={styles.medicationName}>{item.name}</Text>
                                    {item.dosage && (
                                        <Text style={styles.medicationDosage}>{item.dosage}</Text>
                                    )}
                                    {item.frequency && (
                                        <Text style={styles.medicationFrequency}>{item.frequency}</Text>
                                    )}
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#bdc3c7" />
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={renderEmptyState}
                        contentContainerStyle={medications.length === 0 ? { flex: 1 } : null}
                    />
                )}
            </View>
        </ScreenLayout>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.light,
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
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#7f8c8d',
        marginBottom: 8,
        marginTop: 16,
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#95a5a6',
        textAlign: 'center',
    },
    medicationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    medicationInfo: {
        flex: 1,
    },
    medicationName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2c3e50',
        marginBottom: 4,
    },
    medicationDosage: {
        fontSize: 14,
        color: '#7f8c8d',
        marginBottom: 2,
    },
    medicationFrequency: {
        fontSize: 14,
        color: '#7f8c8d',
    },
});

export default MedicationsScreen;