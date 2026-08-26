import { TimeOfObservation } from '@components/TimeOfObservation';
import type { Meta, StoryObj } from '@storybook/react-native';
import { colours } from '@theme/colours';
import { useState } from 'react';

import { View } from 'react-native';


const meta = {
    title: 'Components/TimeOfObservation',
    component: TimeOfObservation,
    decorators: [
        (Story) => (
            <View style={{ flex: 1, alignItems: 'flex-start', backgroundColor: colours.dark }}>
                <Story />
            </View>
        ),
    ],
    // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
    tags: ['autodocs'],
} satisfies Meta<typeof TimeOfObservation>;

export default meta;

type Story = StoryObj<typeof meta>;

const StatefulWrapper = () => {
    const [observationTime, setObservationTime] = useState<Date>(new Date());

    return (
        <TimeOfObservation
            observationTime={observationTime}
            onChange={setObservationTime}
        />
    );
};

export const Default: Story = {
    args: {
        observationTime: new Date(),
        onChange: () => { },
    },
    render: () => <StatefulWrapper />,
};
