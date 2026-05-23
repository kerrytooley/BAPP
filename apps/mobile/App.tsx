import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {Button} from '@components/Button'
// TODO: Add navigation container (React Navigation)
// TODO: Initialize Firebase via packages/repository's initFirebase()
// TODO: Initialize Sentry for error monitoring (@sentry/react-native)

export default function App(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>BAPP — Bat Survey App</Text>
      <Text style={styles.subtitle}>Loading…</Text>
      <Button variant='primary' label='Button'/>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
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
