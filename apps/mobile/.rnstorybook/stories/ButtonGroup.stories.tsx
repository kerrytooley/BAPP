import type { Meta, StoryObj } from '@storybook/react-native';

import { View } from 'react-native';

import { ButtonGroup } from '@components/Button';

const meta = {
    title: 'Components/ButtonGroup',
    component: ButtonGroup,
    decorators: [
        (Story) => (
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
                <Story />
            </View>
        ),
    ],
    // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
    tags: ['autodocs'],
} satisfies Meta<typeof ButtonGroup>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Mixed: Story = {
    args: {
        variant: 'mixed',
        labels: ['Primary Button',
            'Secondary Button',
            'Tertiary Button'
        ],
        onPress: [() => { }, () => { }, () => { }]
    }
}
}

export const Light: Story = {
    args: {
        variant: 'light',
        labels: ['Primary Button',
            'Secondary Button',
            'Tertiary Button'
        ],
        onPress: [() => { }, () => { }]
    }
}

export const Dark: Story = {
    args: {
        variant: 'dark',
        labels: ['Primary Button',
            'Secondary Button',
            'Tertiary Button'
        ],
        onPress: [() => { }, () => { }]
    }
}