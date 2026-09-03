import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts, OleoScript_700Bold } from '@expo-google-fonts/oleo-script';
import { OpenSans_400Regular, OpenSans_600SemiBold } from '@expo-google-fonts/open-sans';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { RootNavigator } from '@navigators/index';
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SurveyServiceProvider } from '@services/surveyServiceContext';
import { useFirebaseService } from './src/hooks/useFirebaseService';
import { FirebaseConnectionError } from '@components/FirebaseConnectionError';
// TODO: Initialize Sentry for error monitoring (@sentry/react-native)

export default function App(): React.JSX.Element | null {
  const [fontsLoaded] = useFonts({ OleoScript_700Bold, OpenSans_400Regular, OpenSans_600SemiBold, ArchivoBlack_400Regular });
  const { service, ready, failed, error, retry } = useFirebaseService();

  if (!fontsLoaded || !ready) return null;

  const content = failed ? (
    <FirebaseConnectionError onRetry={retry} detail={__DEV__ ? error?.message : undefined} />
  ) : (
    <NavigationContainer>
      <RootNavigator />
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

