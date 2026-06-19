import { SummaryRow } from '@components/SummaryRow';
import type { Meta, StoryObj } from '@storybook/react-native';
import { colours } from '@theme/colours';

import { View } from 'react-native';


const meta = {
    title: 'Components/Summary',
    component: SummaryRow,
    decorators: [
        (Story) => (
            <View style={{ flex: 1, alignItems: 'flex-start', backgroundColor: colours.dark }}>
                <Story />
            </View>
        ),
    ],
    // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
    tags: ['autodocs'],
} satisfies Meta<typeof SummaryRow>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SurveyDate: Story = {
    args: {
        label: "Survey Date",
        value: new Date()
    }
}

export const SurveyName: Story = {
    args: {
        label: "Survey Name",
        value: "Name of Survey"
    }
}