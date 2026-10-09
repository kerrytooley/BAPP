import type { Meta, StoryObj } from '@storybook/react-native';
import { Bat, BatItem } from '@components/Display/BatItem';
import { Image, View } from 'react-native';

const meta = {
    title: 'Components/BatItem',
    component: BatItem,
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
} satisfies Meta<typeof BatItem>;

export default meta;

type Story = StoryObj<typeof meta>;

const bat = {
    species: 'Alcathoe'
} as Bat;

export const Default: Story = {
    args: {
        bat,
        disabled: false,
        onPress: () => { }
    }
}