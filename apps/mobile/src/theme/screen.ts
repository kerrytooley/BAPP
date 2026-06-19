import { ViewStyle } from "react-native";
import { colours } from "./colours";

export const screen: { baseScreen: ViewStyle, justifyScreen: ViewStyle, content: ViewStyle } = {
    baseScreen: {
        width: '100%',
        height: '100%',
        backgroundColor: colours.dark,
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    justifyScreen: {
        width: '100%',
        height: '100%',
        backgroundColor: colours.dark,
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 80,
        paddingBottom: 48,
        justifyContent: 'space-between'
    },
    content: {
        width: '100%',
        alignItems: 'center',
        gap: 8,
    }
}