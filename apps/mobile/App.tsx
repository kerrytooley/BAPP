import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, OleoScript_700Bold } from '@expo-google-fonts/oleo-script';
import { WelcomeScreen } from './src/screens/WelcomeScreen';
// TODO: Add navigation container (React Navigation)
// TODO: Initialize Firebase via packages/repository's initFirebase()
// TODO: Initialize Sentry for error monitoring (@sentry/react-native)

export default function App(): React.JSX.Element | null {
  const [fontsLoaded] = useFonts({ OleoScript_700Bold });

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={styles.container}>
        <WelcomeScreen />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    width: '100%',
    height: '100%'
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
