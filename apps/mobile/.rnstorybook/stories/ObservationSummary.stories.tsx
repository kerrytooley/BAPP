import { Observation } from '@bapp/domain';
import { ObservationSummary } from '@components/ObservationSummary';
import type { Meta, StoryObj } from '@storybook/react-native';
import { colours } from '@theme/colours';

import { View } from 'react-native';


const meta = {
    title: 'Components/ObservationSummary',
    component: ObservationSummary,
    decorators: [
        (Story) => (
            <View style={{ flex: 1, alignItems: 'flex-start', backgroundColor: colours.dark }}>
                <Story />
            </View>
        ),
    ],
    // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
    tags: ['autodocs'],
} satisfies Meta<typeof ObservationSummary>;

export default meta;

type Story = StoryObj<typeof meta>;

const observation: Observation = {
    id: '1',
    surveyId: '1',
    locationId: '1',
    surveyorId: '1',
    species: 'Common Pipistrelle',
    firstSeenAt: new Date,
    lastSeenAt: new Date,
    seenCount: 2,
    heardCount: 4,
    frequency: null,
    direction: 'N > W',
    notes: 'A bat flew past and i wrote a really long note about it that porbably span two lines at least',
    emergence: true,
    flightPaths: [{
        id: '1',
        surface: 'boundary',
        points: [],
        data: {}
    }],
    data: {},
    createdAt: new Date,
    updatedAt: new Date
}

export const Default: Story = {
    args: observation
}
