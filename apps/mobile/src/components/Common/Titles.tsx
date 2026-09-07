import { textStyles } from '@theme/fonts';
import React from 'react';
import { Text, View, TextStyle } from 'react-native';


interface TitleProps {
    title: string;
    subtitle?: string;
    style?: TextStyle;
    testID?: string;
}

export const Title = ({
    title,
    subtitle,
    style,
    testID
}: TitleProps) => {
    return (
        <View style={{ width: '100%', paddingTop: 16 }}>
            <Text testID={testID} style={[textStyles.title, style]}>{title}</Text>
            {subtitle != null && <Text style={textStyles.subtitle}>{subtitle}</Text>}
        </View>
    );
}



