import type { Meta, StoryObj } from '@storybook/react-native';
import { WelcomeWalkthrough } from '@components/WelcomeWalkthrough';
import { View } from 'react-native';
import { colours } from '@theme/colours';

const meta = {
    title: 'Components/WelcomeWalkthrough',
    component: WelcomeWalkthrough,
    decorators: [
        (Story) => (
            <View style={{ flex: 1, alignItems: 'flex-start', backgroundColor: colours.dark }}>
                <Story />
            </View>
        ),
    ],
    // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
    tags: ['autodocs'],
    // Use `fn` to spy on the onPress arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#story-args
    args: {},
} satisfies Meta<typeof WelcomeWalkthrough>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {

}