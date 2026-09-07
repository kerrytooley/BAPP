import { BackButton, Button } from "@components/Common/Button";
import { Title } from "@components/Common/Titles";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screen } from "@theme/screen";
import React, { useState } from "react"
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View, Alert, Modal, ActivityIndicator } from "react-native";
import { useSurveyService } from "../../services/surveyServiceContext";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { ValidationError } from "@bapp/domain";
import { RootStackParamList } from "@navigators/index";
import { CompositeNavigationProp } from "@react-navigation/native";
import { ObservationSummary } from "@components/Observation/ObservationSummary";
import { Card } from "@components/Common/Card";
import { textStyles } from "@theme/fonts";
import { colours } from "@theme/colours";
import { formatDate } from "@utils/dateTimeUtils";
import { NoteSummary } from "@components/Observation/NoteSummary";
import { WeatherSummary } from "@components/Display/WeatherSummary";

type Nav = CompositeNavigationProp<
    NativeStackNavigationProp<SurveyorStackParamList>,
    NativeStackNavigationProp<RootStackParamList>
>;

export function SurveySummaryScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const service = useSurveyService();
    const { context } = useActiveSurvey();
    const [saving, setSaving] = useState(false);
    const { surveyId, surveyorId, locationId } = useRoute<RouteProp<SurveyorStackParamList, 'SurveySummaryScreen'>>().params;

    const survey = context?.survey;
    const surveyor = context?.surveyors.find((surveyor) => surveyor.id === surveyorId);
    const observations = context?.observations.filter((observation) => observation.surveyorId === surveyorId);
    const location = context?.locations.find((location) => locationId === location.id);

    const handleComplete = async () => {
        setSaving(true);
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
            Alert.alert(
                "Results sent",
                "Your results have been saved and sent to the lead surveyor.",
                [{ text: "Done", onPress: () => navigation.navigate("Welcome") }],
            );
        } catch {
            Alert.alert("Save failed", "Could not save your results. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={screen.justifyScreen} >
            <View style={{ width: '100%' }} >
                <BackButton navigation={navigation} />
                <Title title="Survey Summary" subtitle={"Summary for surveyor: " + surveyor?.name} />
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
                <Card cardLabel="Equipment Details">
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
                {surveyor?.isLead && survey?.startWeather &&
                    <WeatherSummary type={"start"} weather={survey?.startWeather} />
                }
                {surveyor?.isLead && survey?.endWeather &&
                    <WeatherSummary type={"end"} weather={survey?.endWeather} />
                }
                <Text style={styles.header}>Bat Observations:</Text>
                {
                    observations &&
                    observations.map((observation) => <ObservationSummary key={observation.id} {...observation} />)
                }
                {location && location.notes && <Text style={styles.header}>Location Notes:</Text>}
                {
                    location && location.notes &&

                    location?.notes.map((note) => <NoteSummary {...note} />)
                }
            </ScrollView>
            <Button label={saving ? "Saving…" : "Complete and Save Survey"} disabled={saving} onPress={handleComplete} />
            <Modal visible={saving} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.overlayCard}>
                        <ActivityIndicator size="large" color={colours.light} />
                        <Text style={styles.overlayText}>Saving your results…</Text>
                        <Text style={styles.overlaySubtext}>Sending your results to the lead surveyor.</Text>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

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
    },
    overlay: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)'
    },
    overlayCard: {
        alignItems: 'center',
        gap: 12,
        paddingVertical: 28,
        paddingHorizontal: 32,
        borderRadius: 16,
        backgroundColor: colours.dark
    },
    overlayText: {
        ...textStyles.inputTitleText,
        color: colours.light
    },
    overlaySubtext: {
        ...textStyles.inputText,
        color: colours.light,
        textAlign: 'center'
    }
})