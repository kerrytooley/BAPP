import { ScreenHeader } from "@components/Common/ScreenHeader";
import { Button } from "@components/Common/Button";
import { Card } from "@components/Common/Card";
import { Title } from "@components/Common/Titles";
import { RootStackParamList } from "@navigators/index";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen";
import { colours } from "@theme/colours";
import { textStyles } from "@theme/fonts";
import React, { useState } from "react";
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSurveyService } from "@services/surveyServiceContext";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { exportSurvey } from "@services/export/exportSurvey";
import { SurveyorStatus, SurveyStatus } from "@bapp/domain";
import { displayValue } from "@utils/displayValue";
import { getSetupRows, getSurveyorRows, ItemStatus, StatusRow, worstStatus } from "@utils/surveyStatus";
import { Expandable } from "@components/Common/Expandable";
import { StatusDot } from "@components/Common/StatusDot";

type Nav = CompositeNavigationProp<
    NativeStackNavigationProp<AdminStackParamList>,
    NativeStackNavigationProp<RootStackParamList>
>;

const surveyStatusLabels: Record<SurveyStatus, string> = {
    draft: "Draft",
    active: "In progress",
    completed: "Completed",
};

const surveyorStatusLabels: Record<SurveyorStatus, string> = {
    pending: "Not started",
    confirmed: "Location confirmed",
    ready: "Survey started",
    done: "Survey ended",
};

const itemStatusLabels: Record<ItemStatus, string> = {
    complete: "Complete",
    incomplete: "Incomplete",
    missing: "Missing",
};

const setupEditScreens = {
    details: "CreateSurvey",
    boundary: "UploadRedLineBoundaryScreen",
    surveyors: "AddSurveyorScreen",
} as const;

export function SurveyStatusScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId } = useRoute<RouteProp<AdminStackParamList, "SurveyStatusScreen">>().params;
    const service = useSurveyService();
    const { context } = useActiveSurvey();
    const survey = context?.survey;
    const surveyors = context?.surveyors;
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        // Let the loading overlay paint before we kick off the CPU-heavy export,
        // which otherwise blocks the JS thread and delays the first render.
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        try {
            const { shared } = await exportSurvey(service, surveyId);
            if (!shared) {
                Alert.alert("Export ready", "Sharing isn't available on this device.");
            }
        } catch {
            Alert.alert("Export failed", "Could not build the survey export. Please try again.");
        } finally {
            setExporting(false);
        }
    };

    const doneCount = (surveyors ?? []).filter((s) => s.status === "done").length;
    const setupRows = context ? getSetupRows(context) : [];

    const editSetup = (key: string) => {
        const screenName = setupEditScreens[key as keyof typeof setupEditScreens];
        navigation.navigate(screenName, { surveyId, editing: true });
    };

    const renderRow = (row: StatusRow, onEdit?: () => void) => {
        const statusText = row.detail ?? itemStatusLabels[row.status];
        if (!onEdit) {
            return (
                <View key={row.key} style={styles.row}>
                    <Text style={styles.text}>{row.label}</Text>
                    <Text style={styles.subtext}>{statusText}</Text>
                </View>
            );
        }
        return (
            <View key={row.key} style={styles.row}>
                <View style={styles.rowText}>
                    <Text style={styles.text}>{row.label}</Text>
                    <Text style={styles.subtext}>{statusText}</Text>
                </View>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Edit ${row.label}`} hitSlop={8} onPress={onEdit}>
                    <Text style={styles.edit}>Edit</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <ScreenHeader navigation={navigation} />
                <Title title="Survey Status" subtitle="Track each surveyor and export the survey report" />
            </View>
            <ScrollView style={screen.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Card cardLabel="Survey">
                    <Text style={styles.text}>{String(displayValue(survey?.name))}{survey?.postcode ? ` - ${survey.postcode}` : ""}</Text>
                </Card>
                <Card cardLabel="Overall Status">
                    <Text style={styles.text}>{survey ? surveyStatusLabels[survey.status] : "Loading…"}</Text>
                    {surveyors && (
                        <Text style={styles.subtext}>{doneCount} of {surveyors.length} surveyors completed</Text>
                    )}
                </Card>
                <Text style={styles.header}>Survey setup:</Text>
                {context &&
                    <Expandable
                        accessibilityLabel="Survey setup"
                        header={
                            <View style={styles.expandHeader}>
                                <StatusDot status={worstStatus(setupRows)} />
                                <Text style={styles.text}>Setup details</Text>
                            </View>
                        }
                    >
                        {setupRows.map((row) => renderRow(row, () => editSetup(row.key)))}
                    </Expandable>
                }
                <Text style={styles.header}>Surveyors:</Text>
                {context && (surveyors ?? []).map((surveyor) => {
                    const rows = getSurveyorRows(context, surveyor.id);
                    const name = String(displayValue(surveyor.name));
                    return (
                        <Expandable
                            key={surveyor.id}
                            accessibilityLabel={surveyor.isLead ? `Lead Surveyor: ${name}` : name}
                            header={
                                <View style={styles.expandHeader}>
                                    <StatusDot status={worstStatus(rows)} />
                                    <View style={styles.rowText}>
                                        <Text style={styles.text}>{surveyor.isLead ? `Lead Surveyor: ${name}` : name}</Text>
                                        <Text style={styles.subtext}>{surveyorStatusLabels[surveyor.status]}</Text>
                                    </View>
                                </View>
                            }
                        >
                            {surveyor.status === "done" &&
                                <Button
                                    size="medium"
                                    action="right arrow"
                                    label="See surveyor results"
                                    style={styles.resultsButton}
                                    onPress={() => navigation.navigate("SurveyorResultsScreen", {
                                        surveyId,
                                        surveyorId: surveyor.id,
                                        locationId: surveyor.locationId ?? "",
                                        viewOnly: true,
                                    })}
                                />
                            }
                            {rows.map((row) => renderRow(row))}
                        </Expandable>
                    );
                })}
            </ScrollView>
            <Text style={styles.expiryNote}>Surveys expire 90 days after they're created. Export your report before then.</Text>
            <Button variant="light" label={exporting ? "Exporting…" : "Export & Share Survey Report"} disabled={exporting} onPress={handleExport} />
            <Modal visible={exporting} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.overlayCard}>
                        <ActivityIndicator size="large" color={colours.light} />
                        <Text style={styles.overlayText}>Generating export…</Text>
                        <Text style={styles.overlaySubtext}>This can take a moment for large surveys.</Text>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        ...screen.scrollContent,
        paddingVertical: 24,
        gap: 16,
    },
    text: {
        ...textStyles.inputText,
        color: colours.light,
    },
    subtext: {
        ...textStyles.inputText,
        color: colours.light,
        opacity: 0.7,
    },
    expiryNote: {
        ...textStyles.inputText,
        color: colours.placeholderText,
        textAlign: "center",
        width: "100%",
        paddingBottom: 12,
    },
    header: {
        ...textStyles.inputTitleText,
        textAlign: "left",
        width: "100%",
    },
    expandHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        gap: 12,
    },
    rowText: {
        flex: 1,
        gap: 2,
    },
    resultsButton: {
        marginTop: 8,
        marginBottom: 8,
    },
    edit: {
        ...textStyles.buttonLabel,
        color: colours.light,
        textDecorationLine: "underline",
    },
    overlay: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
    },
    overlayCard: {
        alignItems: "center",
        gap: 12,
        paddingVertical: 28,
        paddingHorizontal: 32,
        borderRadius: 16,
        backgroundColor: colours.dark,
    },
    overlayText: {
        ...textStyles.inputTitleText,
        color: colours.light,
    },
    overlaySubtext: {
        ...textStyles.inputText,
        color: colours.light,
        textAlign: "center",
    },
});
