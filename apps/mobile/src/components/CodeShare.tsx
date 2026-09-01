import { colours } from "@theme/colours";
import { fonts } from "@theme/fonts";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Export from "@assets/icons/upload.svg"
import { Share } from "react-native";

export interface CodeShareProps {
    value?: string;
    codeType?: 'admin' | 'surveyor';
}

export const CodeShare = ({
    value, codeType = 'surveyor'
}: CodeShareProps) => {

    const shareCode = async (code: string | undefined) => {
        try {
            const message = codeType === 'surveyor' ?
                `Join my survey! 🦇 \n\n` +
                `Download or open the BAPP app and join my survey as a surveyor. \n\n` +
                `Enter this code to join: ${code} \n\n` +
                `Download the BAPP app: https://example.com`
                : `${code}`
            await Share.share({ message })
        } catch (e) {
            console.error("Failed to share code", e);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.codeContainer}>
                <Text testID="survey-code" accessibilityLabel={value} style={styles.codeText}>{value}</Text>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Share survey code" onPress={() => shareCode(value)}>
                <Export width={36} />
            </TouchableOpacity>
        </View >
    );

}

export const styles = StyleSheet.create({
    codeContainer: {
        backgroundColor: colours.inputBackground,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignContent: "center",
        justifyContent: "center",
        width: "auto"
    },
    codeText: {
        fontFamily: fonts.family.semiBold,
        fontSize: fonts.size.xxl,
        color: colours.light,
        letterSpacing: 3
    },
    container: {
        width: "100%",
        height: 200,
        alignItems: "center",
        justifyContent: "center",
        gap: 24
    }
})