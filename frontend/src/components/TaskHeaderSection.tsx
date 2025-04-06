import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import { FontAwesome5, Feather } from '@expo/vector-icons';

const SIZE = 64;
const STROKE_WIDTH = 5;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const TasksHeaderSection = ({
                                completionRate,
                                motivationalMessage,
                                filter,
                                setFilter,
                                getFilterCount,
                            }) => {
    const progress = (1 - completionRate / 100) * CIRCUMFERENCE;

    return (
        <View style={styles.container}>
            {/* Progress + Quote */}
            <View style={styles.progressSection}>
                <Svg width={SIZE} height={SIZE}>
                    <Circle
                        stroke="#E0EFFF"
                        fill="none"
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        strokeWidth={STROKE_WIDTH}
                    />
                    <Circle
                        stroke="#3B82F6"
                        fill="none"
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={progress}
                        strokeLinecap="round"
                        strokeWidth={STROKE_WIDTH}
                        rotation="-90"
                        origin={`${SIZE / 2}, ${SIZE / 2}`}
                    />
                </Svg>
                <View style={styles.percentageTextWrapper}>
                    <Text style={styles.percentageText}>{completionRate}%</Text>
                </View>
                <Text style={styles.quote} numberOfLines={2}>{motivationalMessage}</Text>
            </View>

            {/* Filter Buttons */}
            <View style={styles.filters}>
                {renderFilter('all', filter, setFilter, getFilterCount, <Feather name="sliders" size={16} />)}
                {renderFilter('active', filter, setFilter, getFilterCount, <Feather name="check-square" size={16} />)}
                {renderFilter('overdue', filter, setFilter, getFilterCount, <Feather name="alert-triangle" size={16} />)}
                {renderFilter('completed', filter, setFilter, getFilterCount, <Feather name="check-circle" size={16} />)}
            </View>
        </View>
    );
};

const renderFilter = (key, currentFilter, setFilter, getCount, icon) => (
    <TouchableOpacity
        key={key}
        onPress={() => setFilter(key)}
        style={[
            styles.filterButton,
            currentFilter === key && styles.activeFilterButton
        ]}
    >
        {React.cloneElement(icon, {
            color: currentFilter === key ? '#fff' : '#6C6C70'
        })}
        {getCount(key) > 0 && (
            <View style={styles.badge}>
                <Text style={styles.badgeText}>{getCount(key)}</Text>
            </View>
        )}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        paddingVertical: 8,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 16,
        elevation: 1,
        marginBottom: 8
    },
    progressSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    percentageTextWrapper: {
        position: 'absolute',
        left: SIZE / 2 - 14,
        top: SIZE / 2 - 10
    },
    percentageText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#3B82F6'
    },
    quote: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
        marginLeft: 10,
        maxWidth: 100
    },
    filters: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10
    },
    filterButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 4
    },
    activeFilterButton: {
        backgroundColor: '#3B82F6'
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        paddingHorizontal: 4,
        minWidth: 16,
        height: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: '600'
    }
});

export default TasksHeaderSection;
