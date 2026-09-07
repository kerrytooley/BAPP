import type { ReactNode } from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { colours } from '@theme/colours';
import { textStyles } from '@theme/fonts';
import { Close } from '@components/Common/Icons'

export interface CardProps {
    cardLabel: string;
    children?: ReactNode;
    style?: StyleProp<ViewStyle>;
    contentStyle?: StyleProp<ViewStyle>;
    removable?: boolean,
    onClose?: () => void;
}

export const Card = ({
    cardLabel,
    children,
    style,
    contentStyle,
    removable = false,
    onClose
}: CardProps) => {
    return (
        <View style={[styles.cardFlexBox, style]}>
            <View style={styles.labelRow}>
                <Text style={textStyles.inputTitleText}>{cardLabel}</Text>
                {removable &&
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remove ${cardLabel}`} onPress={onClose}>
                        <Close width={12} color={colours.light} />
                    </TouchableOpacity>
                }
            </View>
            <View style={[styles.card, contentStyle]}>
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
        borderRadius: 16,
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
    },
    labelRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
        "paddingEnd": 8

    }
})