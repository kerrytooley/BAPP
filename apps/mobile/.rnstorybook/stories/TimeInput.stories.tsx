import type { Meta, StoryObj } from '@storybook/react-native';

import { View } from 'react-native';

import { TimeInput } from '@components/TimeInput';

const meta = {
    title: 'Components/TimeInput',
    component: TimeInput,
    decorators: [
        (Story) => (
            <View style={{ width: '100%', flex: 1, alignItems: 'flex-start' }}>
                <Story />
            </View>
        ),
    ],

    tags: ['autodocs'],
} satisfies Meta<typeof TimeInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
    args: {
        fieldLabel: 'Time Input Label'
    },
};