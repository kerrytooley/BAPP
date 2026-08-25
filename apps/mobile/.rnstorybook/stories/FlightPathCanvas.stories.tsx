import type { Meta, StoryObj } from '@storybook/react-native';

import { useState } from 'react';
import { View } from 'react-native';

import { FlightPath } from '@bapp/domain';
import { FlightPathCanvas } from '@components/FlightPathCanvas';

const meta = {
    title: 'Components/FlightPathCanvas',
    component: FlightPathCanvas,
    decorators: [
        (Story) => (
            <View style={{ width: '100%', flex: 1, alignItems: 'flex-start' }}>
                <Story />
            </View>
        ),
    ],

    tags: ['autodocs'],
} satisfies Meta<typeof FlightPathCanvas>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: (args) => {
        const [paths, setPaths] = useState<FlightPath[]>([]);
        return (
            <FlightPathCanvas
                {...args}
                paths={paths}
                onCommitPath={(committedPaths) => setPaths((prev) => [...prev, ...committedPaths])}
            />
        );
    },
    args: {
        imageUri: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
        surface: "boundary",
        paths: [],
        onCommitPath: path => {
            console.log('Path committed:', path);
        },
        editable: true
    },
};
