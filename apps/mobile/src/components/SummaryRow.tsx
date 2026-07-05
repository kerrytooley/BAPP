import { colours } from "@theme/colours";
import { textStyles } from "@theme/fonts";
import { formatDate } from "@utils/dateTimeUtils";
import { StyleSheet, Text, View } from "react-native";


export interface SummaryRowProps {
    label: string;
    value: string | Date
}

export interface SummaryGroupProps {
    groupTitle: string;
    summaryRows: Array<SummaryRowProps>;
}

export const SummaryRow = ({
    label,
    value
}: SummaryRowProps) => {
    const formattedValue = value instanceof Date ? formatDate(value) : value;

    return (
        <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{label}</Text>
            <Text style={styles.summaryValue}>{formattedValue}</Text>
        </View>
    );
}

export const SummaryGroup = ({
    groupTitle,
    summaryRows
}: SummaryGroupProps) => {
    return (
        <View style={styles.summaryGroup} >
            <Text style={textStyles.inputTitleText}>{groupTitle}</Text>
            {summaryRows.map(row =>
                <SummaryRow label={row.label} value={row.value} />
            )}
            <View style={styles.divider} />
        </View>
    )
}

const styles = StyleSheet.create({
    summaryRow: {
        flexDirection: "row",
        width: "100%",
        justifyContent: "space-between",
        gap: 8,
    },
    summaryLabel: {
        ...textStyles.subtitle,
        flexShrink: 0
    },
    summaryValue: {
        ...textStyles.subtitle,
        flex: 1,
        textAlign: "right"
    },
    summaryGroup: {
        width: "100%",
        flexDirection: "column",
        gap: 8
    },
    divider: {
        height: 1,
        width: "100%",
        backgroundColor: colours.light
    }
})