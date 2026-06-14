import type { Meta, StoryObj } from '@storybook/react-native';

import { View } from 'react-native';
import { CodeInput } from '@components/CodeInput';


const meta = {
    title: 'Components/CodeInput',
    component: CodeInput,
    decorators: [
        (Story) => (
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Story />
            </View>
        ),
    ],
    // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
    tags: ['autodocs'],
} satisfies Meta<typeof CodeInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    args: {
        placeholder: "XXXXXX",
    }
}

export const WithInput: Story = {
    args: {
        value: "123-456"
    }
}

