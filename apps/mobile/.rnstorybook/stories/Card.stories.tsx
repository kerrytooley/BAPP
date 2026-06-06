import type { Meta, StoryObj } from '@storybook/react-native';

import { View } from 'react-native';

import { Card } from '@components/Card';
import { InputField } from '@components/InputField';
import { Button } from '@components/Button';

const meta = {
    title: 'Components/Card',
    component: Card,
    decorators: [
        (Story) => (
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Story />
            </View>
        ),
    ],
    // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
    tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    args: {
        cardLabel: "Card Label"
    }
}

export const WithInput: Story = {
    args: {
        cardLabel: "Card Label",
        children: [<InputField placeholderText='Input Field' />, <Button label='Button' action='add' />]
    }
}

