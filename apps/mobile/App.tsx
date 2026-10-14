import React, { useState } from 'react';
import { Keyboard, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationState, PartialState } from '@react-navigation/native';
import { useFonts, OleoScript_700Bold } from '@expo-google-fonts/oleo-script';
import { OpenSans_400Regular, OpenSans_600SemiBold } from '@expo-google-fonts/open-sans';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { RootNavigator } from '@navigators/index';
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SurveyServiceProvider } from '@services/surveyServiceContext';
import { ActiveSurveyProvider } from '@services/ActiveSurveyProvider';
import { useFirebaseService } from './src/hooks/useFirebaseService';
import { FirebaseConnectionError } from '@components/FirebaseConnectionError';
// TODO: Initialize Sentry for error monitoring (@sentry/react-native)

type AnyNavigationState = NavigationState | PartialState<NavigationState>;

/**
 * Walk from the root navigation state down through nested navigators to the
 * focused leaf route and return its `surveyId` param (if any). This is what the
 * ActiveSurveyProvider subscribes to, so it always tracks the survey the user
 * is currently looking at.
 */
export function findActiveSurveyId(state: AnyNavigationState | undefined): string | undefined {
  if (!state || state.routes.length === 0) return undefined;
  const index = state.index ?? state.routes.length - 1;
  const route = state.routes[index];
  if (route.state) {
    const nested = findActiveSurveyId(route.state as AnyNavigationState);
    if (nested !== undefined) return nested;
  }
  const params = route.params as { surveyId?: string } | undefined;
  return params?.surveyId;
}

export default function App(): React.JSX.Element | null {
  const [fontsLoaded] = useFonts({ OleoScript_700Bold, OpenSans_400Regular, OpenSans_600SemiBold, ArchivoBlack_400Regular });
  const { service, ready, failed, error, retry } = useFirebaseService();
  const [activeSurveyId, setActiveSurveyId] = useState<string | undefined>(undefined);

  if (!fontsLoaded || !ready) return null;

  const content = failed ? (
    <FirebaseConnectionError onRetry={retry} detail={__DEV__ ? error?.message : undefined} />
  ) : (
    <NavigationContainer
      onStateChange={(state) => setActiveSurveyId(findActiveSurveyId(state))}
    >
      <ActiveSurveyProvider surveyId={activeSurveyId}>
        {/* Taps that no control handles dismiss the keyboard (number pads and multiline notes have no return to close).
            Only claims the touch while the keyboard is open, otherwise it swallows ScrollView drags. */}
        <View
          style={{ flex: 1 }}
          onStartShouldSetResponder={() => Keyboard.isVisible()}
          onResponderRelease={() => Keyboard.dismiss()}
        >
          <RootNavigator />
        </View>
      </ActiveSurveyProvider>
    </NavigationContainer>
  );

  const app = (
    <GestureHandlerRootView style={{ flex: 1 }} >
      <SafeAreaProvider>
        <ActionSheetProvider>
          <BottomSheetModalProvider>
            <StatusBar style="light" />
            {content}
          </BottomSheetModalProvider>
        </ActionSheetProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  return service ? <SurveyServiceProvider value={service}>{app}</SurveyServiceProvider> : app;
}

