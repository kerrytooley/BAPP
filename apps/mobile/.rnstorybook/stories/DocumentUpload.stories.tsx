import { DocumentUpload } from '@components/DocumentUpload';
import type { Meta, StoryObj } from '@storybook/react-native';
import { colours } from '@theme/colours';

import { View } from 'react-native';



const meta = {
    title: 'Components/DocumentUpload',
    component: DocumentUpload,
    decorators: [
        (Story) => (
            <View style={{ width: '100%', flex: 1, alignItems: 'flex-start', backgroundColor: colours.dark }}>
                <Story />
            </View>
        ),
    ],

    tags: ['autodocs'],
} satisfies Meta<typeof DocumentUpload>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
    args: {
        onChange: () => { }
    },
};