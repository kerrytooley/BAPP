import React from 'react';
import type { Preview } from '@storybook/react-native';
import { useFonts, OleoScript_700Bold } from '@expo-google-fonts/oleo-script';
import { OpenSans_400Regular, OpenSans_600SemiBold } from '@expo-google-fonts/open-sans';

const WithFonts = ({ children }: { children: React.ReactNode }) => {
  const [fontsLoaded] = useFonts({ OleoScript_700Bold, OpenSans_400Regular, OpenSans_600SemiBold });
  if (!fontsLoaded) return null;
  return <>{children}</>;
};

const preview: Preview = {
  decorators: [
    (Story) => (
      <WithFonts>
        <Story />
      </WithFonts>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        date: /Date$/,
      },
    },
  },
};

export default preview;
