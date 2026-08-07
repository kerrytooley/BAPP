import type { Meta, StoryObj } from '@storybook/react-native';
import { BatGrid } from '@components/BatGrid';
import { View } from 'react-native';
import { bats } from '../../src/data/bats';

const meta = {
    title: 'Components/BatGrid',
    component: BatGrid,
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
} satisfies Meta<typeof BatGrid>;

export default meta;

type Story = StoryObj<typeof meta>;


export const Default: Story = {
    args: {
        bats,
        onPress(species) {

        },
    }
}