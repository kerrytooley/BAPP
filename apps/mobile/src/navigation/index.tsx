import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NavigatorScreenParams } from '@react-navigation/native';

import { WelcomeScreen } from '@screens/WelcomeScreen';
import { AdminNavigator, type AdminStackParamList } from './AdminNavigator';
import { SurveyorNavigator, type SurveyorStackParamList } from './SurveyorNavigator';

export type RootStackParamList = {
    Welcome: undefined;
    Admin: NavigatorScreenParams<AdminStackParamList> | undefined;
    Surveyor: NavigatorScreenParams<SurveyorStackParamList> | undefined;
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
}
