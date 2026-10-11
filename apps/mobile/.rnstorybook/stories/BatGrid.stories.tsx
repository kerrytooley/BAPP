import type { Meta, StoryObj } from '@storybook/react-native';
import { BatGrid } from '@components/Display/BatGrid';
import { View } from 'react-native';
import { bats } from '../../src/data/bats';
import { colours } from '@theme/colours';
import { ScrollView } from 'react-native-gesture-handler';
import { screen } from '@theme/screen';

const meta = {
    title: 'Components/BatGrid',
    component: BatGrid,
    decorators: [
        (Story) => (
            <ScrollView style={screen.scroll} contentContainerStyle={screen.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={{ flex: 1, alignItems: 'flex-start', backgroundColor: colours.dark }}>
                    <Story />
                </View>
            </ScrollView >
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
        isLoading: false,
        onPress(species) {

        },
    }
}