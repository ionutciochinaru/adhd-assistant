import { useState, useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useTabBarHeight = () => {
    const [tabBarHeight, setTabBarHeight] = useState(80); // Default height
    const insets = useSafeAreaInsets();

    useEffect(() => {
        // Base tab bar height
        const baseHeight = 80;

        // Add bottom inset for devices with home indicator or safe area
        const dynamicHeight = baseHeight + (insets.bottom > 0 ? insets.bottom : 16);

        setTabBarHeight(dynamicHeight);
    }, [insets.bottom]);

    return tabBarHeight;
};