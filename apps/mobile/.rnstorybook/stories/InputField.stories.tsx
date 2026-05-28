import type { Meta, StoryObj } from '@storybook/react-native';

import { View } from 'react-native';
import { fn } from 'storybook/test';

import { InputField } from '@components/InputField';

const meta = {
    title: 'Components/InputField',
    component: InputField,
    decorators: [
        (Story) => (
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Story />
            </View>
        ),
    ],

    tags: ['autodocs'],
    args: { onPress: fn() },
} satisfies Meta<typeof InputField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
    args: {
        placeholderText: 'Input Field',
        fieldLabel: 'Input Field Label'
    },
};