import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { TimePickerInput } from '@components/TimePickerInput';

const meta = {
    title: 'Components/TimePickerInput',
    component: TimePickerInput,
    decorators: [
        (Story) => (
            <View style={{ width: '100%', flex: 1, alignItems: 'flex-start', padding: 24, backgroundColor: '#000' }}>
                <Story />
            </View>
        ),
    ],
    tags: ['autodocs'],
} satisfies Meta<typeof TimePickerInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NoValue: Story = {
    render: (args) => {
        const [date, setDate] = useState<Date | undefined>(undefined);

        return (
            <TimePickerInput
                {...args}
                value={date}
                onChange={setDate}
            />
        );
    },
    args: {
        fieldLabel: 'Start Time',
    },
};

export const WithValue: Story = {
    render: (args) => {
        const [date, setDate] = useState<Date>(new Date('2026-06-05T21:32:00'));
        return <TimePickerInput {...args} value={date} onChange={setDate} />;
    },
    args: {
        fieldLabel: 'Survey StartTime',
    },
};
