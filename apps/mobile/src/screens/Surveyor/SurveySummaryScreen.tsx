import { BackButton, Button } from "@components/Button";
import { Title } from "@components/Titles";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screen } from "@theme/screen";
import React, { useEffect, useState } from "react"
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { ScrollView, StyleSheet, Text, View, Alert, Modal, ActivityIndicator } from "react-native";
import { useSurveyService } from "../../services/surveyServiceContext";
import { Observation, Survey, Surveyor, ValidationError } from "@bapp/domain";
import { RootStackParamList } from "@navigators/index";
import { CompositeNavigationProp } from "@react-navigation/native";
import { ObservationSummary } from "@components/ObservationSummary";
import { Card } from "@components/Card";
import { textStyles } from "@theme/fonts";
import { colours } from "@theme/colours";
import { formatDate } from "@utils/dateTimeUtils";

type Nav = CompositeNavigationProp<
    NativeStackNavigationProp<SurveyorStackParamList>,
    NativeStackNavigationProp<RootStackParamList>
>;

export function SurveySummaryScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const [observations, setObservations] = useState<Observation[]>();
    const [survey, setSurvey] = useState<Survey>();
    const [surveyor, setSurveyor] = useState<Surveyor>();
    const service = useSurveyService();
    const [saving, setSaving] = useState(false);
    const { surveyId, surveyorId } = useRoute<RouteProp<SurveyorStackParamList, 'SetupCompleteScreen'>>().params;

    useEffect(() => {
        const loadContext = async () => {
            const { survey, surveyors, observations } = await service.getSurveyContext(surveyId);
            const surveyorObservations = observations.filter((observation) => observation.surveyorId === surveyorId)
            setObservations(surveyorObservations);
            setSurveyor(surveyors.find((surveyor) => surveyor.id === surveyorId));
            setSurvey(survey);
        }
        loadContext();
    }, [surveyId, service])

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
                <Text style={styles.header}>Bat Observations:</Text>
                {
                    observations &&
                    observations.map((observation) => <ObservationSummary key={observation.id} {...observation} />)
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