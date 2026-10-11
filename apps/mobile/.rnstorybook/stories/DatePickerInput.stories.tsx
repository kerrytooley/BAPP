import type { Meta, StoryObj } from '@storybook/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { DatePickerInput } from '@components/DateTime/DatePickerInput';

const meta = {
    title: 'Components/DatePickerInput',
    component: DatePickerInput,
    decorators: [
        (Story) => (
            <View style={{ width: '100%', flex: 1, alignItems: 'flex-start', padding: 24, backgroundColor: '#000' }}>
                <Story />
            </View>
        ),
    ],
    tags: ['autodocs'],
} satisfies Meta<typeof DatePickerInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const NoValue: Story = {
    render: (args) => {
        const [date, setDate] = useState<Date | undefined>(undefined);

        return (
            <DatePickerInput
                {...args}
                value={date}
                onChange={setDate}
            />
        );
    },
    args: {
        fieldLabel: 'Survey Date',
    },
};

export const WithValue: Story = {
    render: (args) => {
        const [date, setDate] = useState<Date>(new Date('2026-06-05'));
        return <DatePickerInput {...args} value={date} onChange={setDate} />;
    },
    args: {
        fieldLabel: 'Survey Date',
    },
};
