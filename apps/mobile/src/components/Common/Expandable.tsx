import { useState, type ReactNode } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { colours } from "@theme/colours";
import { ChevronDown } from "./Icons";

export interface ExpandableProps {
    header: ReactNode;
    /** Spoken by screen readers for the header button. */
    accessibilityLabel: string;
    children: ReactNode;
    initiallyExpanded?: boolean;
}

export const Expandable = ({ header, accessibilityLabel, children, initiallyExpanded = false }: ExpandableProps) => {
    const [expanded, setExpanded] = useState(initiallyExpanded);

    return (
        <View style={styles.container}>
            <TouchableOpacity
                style={styles.header}
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel}
                accessibilityState={{ expanded }}
                onPress={() => setExpanded((open) => !open)}
            >
                <View style={styles.headerContent}>{header}</View>
                <ChevronDown style={expanded ? styles.chevronOpen : undefined} />
            </TouchableOpacity>
            {expanded && <View style={styles.body}>{children}</View>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        backgroundColor: colours.cardbackground,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colours.inputBorder,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 15,
    },
    headerContent: {
        flex: 1,
    },
    chevronOpen: {
        transform: [{ rotate: "180deg" }],
    },
    body: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colours.inputBorder,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
});
