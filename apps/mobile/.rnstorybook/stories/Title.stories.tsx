import type { Meta, StoryObj } from '@storybook/react-native';

import { View } from 'react-native';

import { Title } from '@components/Titles';
import { colours } from '@theme/colours';

const meta = {
    title: 'Components/Title',
    component: Title,
    decorators: [
        (Story) => (
            <View style={{ width: '100%', flex: 1, alignItems: 'flex-start', backgroundColor: colours.dark }}>
                <Story />
            </View>
        ),
    ],

    tags: ['autodocs'],
} satisfies Meta<typeof Title>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ScreenTitle: Story = {
    args: {
        title: 'Title'
    },
};

export const ScreenTitleWithSubheading: Story = {
    args: {
        title: 'Title',
        subtitle: 'A subheading to give more context about the screen and add information'
    },
};
