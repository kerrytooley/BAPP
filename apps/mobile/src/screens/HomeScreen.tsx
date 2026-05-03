import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

// TODO: Implement HomeScreen with role-based navigation
//   - Survey Admin: show survey list and create-survey button
//   - Surveyor: show assigned sub-surveys

export function HomeScreen(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text>Home Screen — TODO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
