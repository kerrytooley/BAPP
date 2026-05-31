import type { Meta, StoryObj } from '@storybook/react-native';

import { View } from 'react-native';

import { InputField } from '@components/InputField';

const meta = {
    title: 'Components/InputField',
    component: InputField,
    decorators: [
        (Story) => (
            <View style={{ width: '100%', flex: 1, alignItems: 'flex-start' }}>
                <Story />
            </View>
        ),
    ],

    tags: ['autodocs'],
} satisfies Meta<typeof InputField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
    args: {
        placeholderText: 'Input Field',
        fieldLabel: 'Input Field Label'
    },
};

export const PrimaryWithUnit: Story = {
    args: {
        variant: 'unit',
        placeholderText: 'Input Field',
        fieldLabel: 'Input Field Label',
        unit: 'Hz'
    },
};

export const Large: Story = {
    args: {
        placeholderText: 'Input Field with multiple lines',
        fieldLabel: 'Input Field Label',
        size: 'large'
    }
}

export const LargeWithUnit: Story = {
    args: {
        placeholderText: 'Input Field with multiple lines',
        fieldLabel: 'Input Field Label',
        size: 'large',
        variant: 'unit',
        unit: 'Hz'
    }
}