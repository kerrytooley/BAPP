import type { Meta, StoryObj } from '@storybook/react-native';
import { CountdownClock } from '@components/CountdownClock';
import { Image, View } from 'react-native';

const meta = {
    title: 'Components/CountdownClock',
    component: CountdownClock,
    decorators: [
        (Story) => (
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Story />
            </View>
        ),
    ],
    // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
    tags: ['autodocs'],
    // Use `fn` to spy on the onPress arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#story-args
    args: {},
} satisfies Meta<typeof CountdownClock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
    args: {
        startTime: new Date(Date.now() + 3600),
        endTime: new Date(Date.now() + 7200000)
    }
}