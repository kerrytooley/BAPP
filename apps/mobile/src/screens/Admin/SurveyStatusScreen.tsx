import { BackButton, Button } from "@components/Common/Button";
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
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSurveyService } from "@services/surveyServiceContext";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { exportSurvey } from "@services/export/exportSurvey";
import { SurveyorStatus, SurveyStatus } from "@bapp/domain";
import { displayValue } from "@utils/displayValue";

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
    ready: "In progress",
    done: "Completed",
};

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

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <BackButton navigation={navigation} />
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
                <Text style={styles.header}>Surveyors:</Text>
                {(surveyors ?? []).map((surveyor) => (
                    <Card key={surveyor.id} cardLabel={surveyor.isLead ? `Lead Surveyor: ${displayValue(surveyor.name)}` : String(displayValue(surveyor.name))}>
                        <Text style={styles.text}>{surveyorStatusLabels[surveyor.status]}</Text>
                    </Card>
                ))}
            </ScrollView>
            <Button label={exporting ? "Exporting…" : "Export & Share"} disabled={exporting} onPress={handleExport} />
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
    header: {
        ...textStyles.inputTitleText,
        textAlign: "left",
        width: "100%",
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
