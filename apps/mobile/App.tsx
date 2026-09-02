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
// TODO: Initialize Firebase via packages/repository's initFirebase()
// TODO: Initialize Sentry for error monitoring (@sentry/react-native)

export default function App(): React.JSX.Element | null {
  const [fontsLoaded] = useFonts({ OleoScript_700Bold, OpenSans_400Regular, OpenSans_600SemiBold, ArchivoBlack_400Regular });

  if (!fontsLoaded) return null;

  return (
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
}
