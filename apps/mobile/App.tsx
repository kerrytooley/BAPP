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
import type { SurveyService } from '@bapp/domain';
import { SurveyServiceProvider } from '@services/surveyServiceContext';
import { isFirebaseEnabled, createFirebaseSurveyService } from '@services/firebaseSurveyService';
// TODO: Initialize Sentry for error monitoring (@sentry/react-native)

/** When Firebase is opted in, build its backend once before rendering; otherwise
 *  the screens use the default in-memory service from the context. */
function useFirebaseService(): { service: SurveyService | null; ready: boolean } {
  const [service, setService] = React.useState<SurveyService | null>(null);

  React.useEffect(() => {
    if (!isFirebaseEnabled()) return;
    let active = true;
    createFirebaseSurveyService()
      .then((s) => { if (active) setService(s); })
      .catch((err) => { console.error('Firebase init failed', err); });
    return () => { active = false; };
  }, []);

  return { service, ready: !isFirebaseEnabled() || service !== null };
}

export default function App(): React.JSX.Element | null {
  const [fontsLoaded] = useFonts({ OleoScript_700Bold, OpenSans_400Regular, OpenSans_600SemiBold, ArchivoBlack_400Regular });
  const { service, ready } = useFirebaseService();

  if (!fontsLoaded || !ready) return null;

  const app = (
    <GestureHandlerRootView style={{ flex: 1 }} >
      <SafeAreaProvider>
        <ActionSheetProvider>
          <BottomSheetModalProvider>
            <StatusBar style="light" />
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </BottomSheetModalProvider>
        </ActionSheetProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  return service ? <SurveyServiceProvider value={service}>{app}</SurveyServiceProvider> : app;
}

