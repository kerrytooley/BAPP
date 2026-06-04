import { textStyles } from '@theme/fonts';
import React from 'react';
import { Text, View, TextStyle } from 'react-native';


interface TitleProps {
    title: string;
    subtitle?: string;
    style?: TextStyle;
}

export const Title = ({
    title,
    subtitle,
    style
}: TitleProps) => {
    return (
        <View style={{ width: '100%', gap: 16 }}>
            <Text style={[textStyles.title, style]}>{title}</Text>
            {subtitle != null && <Text style={textStyles.subtitle}>{subtitle}</Text>}
        </View>
    );
}



