import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { WelcomeScreen } from '@screens/WelcomeScreen';
import { AdminNavigator } from './AdminNavigator';
import { SurveyorNavigator } from './SurveyorNavigator';

export type RootStackParamList = {
    Welcome: undefined;
    Admin: undefined;
    Surveyor: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Admin" component={AdminNavigator} />
            <Stack.Screen name="Surveyor" component={SurveyorNavigator} />
        </Stack.Navigator>
    );
};
