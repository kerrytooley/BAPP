import { ScreenHeader } from "@components/Common/ScreenHeader";
import { Button } from "@components/Common/Button";
import { Title } from "@components/Common/Titles";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screen } from "@theme/screen";
import React, { useRef, useState } from "react"
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSurveyService } from "../../services/surveyServiceContext";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { flightPathLetter, ValidationError } from "@bapp/domain";
import { RootStackParamList } from "@navigators/index";
import { CompositeNavigationProp } from "@react-navigation/native";
import { ObservationSummary } from "@components/Observation/ObservationSummary";
import { Card } from "@components/Common/Card";
import { textStyles } from "@theme/fonts";
import { colours } from "@theme/colours";
import { formatDate } from "@utils/dateTimeUtils";
import { NoteSummary } from "@components/Observation/NoteSummary";
import { WeatherSummary } from "@components/Display/WeatherSummary";
import { ConfirmModal } from "@components/Modals/ConfirmModal";

type Nav = CompositeNavigationProp<
    NativeStackNavigationProp<SurveyorStackParamList>,
    NativeStackNavigationProp<RootStackParamList>
>;

type SaveStatus = "idle" | "saving" | "sent" | "failed";

export function SurveySummaryScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const service = useSurveyService();
    const { context } = useActiveSurvey();
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const saving = saveStatus === "saving";
    // Keeps the last content on screen while the modal fades out.
    const shownStatus = useRef<Exclude<SaveStatus, "idle">>("saving");
    if (saveStatus !== "idle") shownStatus.current = saveStatus;
    // viewOnly: opened by the admin from Survey Status to read a finished surveyor's results.
    const { surveyId, surveyorId, locationId, viewOnly = false } = useRoute<RouteProp<SurveyorStackParamList, 'SurveySummaryScreen'>>().params;

    const survey = context?.survey;
    const surveyor = context?.surveyors.find((surveyor) => surveyor.id === surveyorId);
    const observations = context?.observations.filter((observation) => observation.surveyorId === surveyorId);
    const location = context?.locations.find((location) => locationId === location.id);

    const handleComplete = async () => {
        setSaveStatus("saving");
        try {
            await service.completeSurveyor(surveyorId);
            try {
                await service.completeSurvey(surveyId);
            } catch (error) {
                // Expected fail if not all surveyors completed.
                if (!(error instanceof ValidationError)) {
                    throw error;
                }
            }
            setSaveStatus("sent");
        } catch {
            setSaveStatus("failed");
        }
    };

    return (
        <View style={screen.justifyScreen} >
            <View style={{ width: '100%' }} >
                <ScreenHeader navigation={navigation} />
                <Title title={viewOnly ? "Surveyor Results" : "Survey Summary"} subtitle={"Summary for surveyor: " + surveyor?.name} />
            </View>
            <ScrollView style={[screen.scroll]} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <Card cardLabel="Survey Title">
                    <Text style={styles.text}>{survey?.name + " - " + survey?.postcode}</Text>
                </Card>
                <Card cardLabel="Surveyor Name">
                    <Text style={styles.text}>{surveyor?.name}</Text>
                </Card>
                <Card cardLabel="Date and Time">
                    <Text style={styles.text}>{formatDate(survey?.date)}</Text>
                </Card>
                <Card
                    cardLabel="Equipment Details"
                    onEdit={viewOnly ? undefined : () => navigation.navigate("EquipmentDetailsScreen", { surveyId, surveyorId, locationId, mode: "edit" })}
                >
                    <View style={styles.row}>
                        <Text style={styles.text}>Audio label: </Text>
                        <Text style={styles.text}>{location?.equipmentInformation?.audioLabel ?? 'N/A'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.text}>Video label: </Text>
                        <Text style={styles.text}>{location?.equipmentInformation?.videoLabel ?? 'N/A'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.text}>Other info: </Text>
                        <Text style={styles.text}>{location?.equipmentInformation?.otherInfo ?? 'N/A'}</Text>
                    </View>
                </Card>
                {surveyor?.isLead && (["start", "end"] as const).map((type) => (
                    <WeatherSummary
                        key={type}
                        type={type}
                        weather={(type === "start" ? survey?.startWeather : survey?.endWeather) ?? null}
                        onEdit={viewOnly ? undefined : () => navigation.navigate("WeatherConditionsScreen", { surveyId, surveyorId, locationId, type, mode: "edit" })}
                    />
                ))}
                <Text style={styles.header}>Bat Observations:</Text>
                {
                    observations &&
                    observations.map((observation) => (
                        <ObservationSummary
                            key={observation.id}
                            {...observation}
                            flightPathLetters={{
                                overhead: flightPathLetter(observation, observations, 'boundary'),
                                frontView: flightPathLetter(observation, observations, 'frontView'),
                            }}
                        />
                    ))
                }
                {location && location.notes && <Text style={styles.header}>Location Notes:</Text>}
                {
                    location && location.notes &&

                    location?.notes.map((note) => <NoteSummary {...note} />)
                }
            </ScrollView>
            {!viewOnly &&
                <Button label={saving ? "Saving…" : "Complete and Save Survey"} disabled={saving} onPress={handleComplete} />
            }
            {/* One modal for every state: iOS can't present a second Modal while another is dismissing. */}
            <ConfirmModal
                visible={saveStatus !== "idle"}
                loading={saving}
                {...saveModalContent[shownStatus.current]}
                onConfirm={() => {
                    setSaveStatus("idle");
                    if (saveStatus === "sent") navigation.navigate("Welcome");
                }}
            />
        </View>
    )
}

const saveModalContent: Record<Exclude<SaveStatus, "idle">, { title: string; message: string; confirmLabel?: string }> = {
    saving: { title: "Saving your results…", message: "Sending your results to the lead surveyor." },
    sent: { title: "Results sent", message: "Your results have been saved and sent to the survey admin.", confirmLabel: "Done" },
    failed: { title: "Save failed", message: "Could not save your results. Please try again.", confirmLabel: "OK" },
};

const styles = StyleSheet.create({
    scrollContent: {
        ...screen.scrollContent,
        paddingVertical: 24,
        gap: 16
    },
    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%"
    },
    text: {
        ...textStyles.inputText,
        color: colours.light
    },
    header: {
        ...textStyles.inputTitleText,
        textAlign: 'left',
        width: '100%'
    }
})