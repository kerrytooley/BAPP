import { ViewStyle } from "react-native";
import { colours } from "./colours";

export const screen: { baseScreen: ViewStyle, justifyScreen: ViewStyle, content: ViewStyle, scroll: ViewStyle, scrollContent: ViewStyle } = {
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
        paddingTop: 60,
        paddingBottom: 48,
        justifyContent: 'space-between'
    },
    content: {
        width: '100%',
        alignItems: 'center',
        gap: 8,
    },
    scroll: {
        width: '100%',
        flex: 1,
    },
    scrollContent: {
        width: '100%',
        alignItems: 'center',
        gap: 8,
        justifyContent: "flex-start",
        flexGrow: 1,
    }
}