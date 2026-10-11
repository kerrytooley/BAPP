import { StyleSheet, View } from "react-native";
import { colours } from "@theme/colours";
import type { ItemStatus } from "@utils/surveyStatus";

const DOT_COLOURS: Record<ItemStatus, string> = {
    complete: colours.green,
    incomplete: colours.amber,
    missing: colours.red,
};

export const StatusDot = ({ status }: { status: ItemStatus }) => (
    <View testID={`status-dot-${status}`} style={[styles.dot, { backgroundColor: DOT_COLOURS[status] }]} />
);

const styles = StyleSheet.create({
    dot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
});
