import { HeardAndSeenCount } from '@components/HeardAndSeenCount';
import type { Meta, StoryObj } from '@storybook/react-native';
import { colours } from '@theme/colours';
import { useState } from 'react';

import { View } from 'react-native';


const meta = {
    title: 'Components/HeardAndSeenCount',
    component: HeardAndSeenCount,
    decorators: [
        (Story) => (
            <View style={{ flex: 1, alignItems: 'flex-start', backgroundColor: colours.dark }}>
                <Story />
            </View>
        ),
    ],
    // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
    tags: ['autodocs'],
} satisfies Meta<typeof HeardAndSeenCount>;

export default meta;

type Story = StoryObj<typeof meta>;

const StatefulWrapper = () => {
    const [seenCount, setSeenCount] = useState<number>(0);
    const [heardCount, setHeardCount] = useState<number>(0);

    return (
        <HeardAndSeenCount
            seenCount={seenCount}
            heardCount={heardCount}
            onChangeHeard={setHeardCount}
            onChangeSeen={setSeenCount}
        />
    );
};

export const Default: Story = {
    args: {
        seenCount: 0,
        heardCount: 0,
        onChangeHeard: () => { },
        onChangeSeen: () => { }
    },
    render: () => <StatefulWrapper />,
};
