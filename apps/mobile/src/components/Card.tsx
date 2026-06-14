import type { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colours } from '@theme/colours';
import { textStyles } from '@theme/fonts';

export interface CardProps {
    cardLabel: string;
    children?: ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const Card = ({
    cardLabel,
    children,
    style
}: CardProps) => {
    return (
        <View style={[styles.cardFlexBox, style]}>
            <View>
                <Text style={textStyles.inputTitleText}>{cardLabel}</Text>
            </View>
            <View style={styles.card}>
                {children}
            </View>

        </View>

    );
}

const styles = StyleSheet.create({
    cardFlexBox: {
        width: '100%',
        gap: 8
    },
    card: {
        backgroundColor: colours.cardbackground,
        borderRadius: 24,
        minHeight: 100,
        alignContent: "center",
        justifyContent: "center",
        borderStyle: "solid",
        borderColor: colours.inputBorder,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 15,
        gap: 8
    },
    cardLabelText: {
        ...textStyles.inputTitleText,
        textTransform: "uppercase",
        color: colours.inputTitle,
        textAlign: "left"
    }
})