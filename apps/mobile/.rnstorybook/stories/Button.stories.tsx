import type { Meta, StoryObj } from '@storybook/react-native';

import { View } from 'react-native';
import { fn } from 'storybook/test';

import { Button } from '@components/Button';

const meta = {
  title: 'Components/Button',
  component: Button,
  decorators: [
    (Story) => (
      <View style={{ flex: 1, alignItems: 'flex-start' }}>
        <Story />
      </View>
    ),
  ],
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // Use `fn` to spy on the onPress arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#story-args
  args: { onPress: fn() },
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Dark: Story = {
  args: {
    variant: 'dark',
    label: 'Button',
  },
};

export const Light: Story = {
  args: {
    variant: 'light',
    label: 'Button',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    label: 'Button',
  },
};

export const ActionAdd: Story = {
  args: {
    variant: 'dark',
    label: 'Add Button',
    action: 'add'
  }
}

export const ActionLocation: Story = {
  args: {
    variant: 'dark',
    label: 'Location Button',
    action: 'location'
  }
}

export const ActionArrow: Story = {
  args: {
    variant: 'dark',
    label: 'Arrow Button',
    action: 'right arrow'
  }
}

