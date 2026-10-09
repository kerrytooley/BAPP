import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenHeader } from "@components/Common/ScreenHeader";
import { Button, InlineButton } from "@components/Common/Button";
import { Title } from "@components/Common/Titles";
import { useEffect, useState } from "react";
import { useSurveyService } from "@services/surveyServiceContext";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { SummaryGroup } from "@components/Display/SummaryRow";
import { displayValue } from "@utils/displayValue";
import { DocumentPreview } from "@components/Display/DocumentPreview";
import { textStyles } from "@theme/fonts";
import { goToLocationStep } from "@services/locationStep";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function ConfirmSurveyorDetailsScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const service = useSurveyService();
    const { surveyId, surveyorId } = useRoute<RouteProp<SurveyorStackParamList, 'ConfirmSurveyorDetailsScreen'>>().params;
    const { context } = useActiveSurvey();
    const [boundaryImage, setBoundaryImage] = useState<string | null>();

    const survey = context?.survey;
    const surveyor = context?.surveyors.find((surveyor) => surveyor?.id == surveyorId);
    const positions = surveyor?.isLead
        ? (context?.locations.flatMap((location) => location.boundaryPosition ?? []) ?? [])
        : (context?.locations
            .filter((location) => location.id === surveyor?.locationId)
            .flatMap((location) => location.boundaryPosition ?? []) ?? []);
    const type = "start";
    const locationId = surveyor?.locationId || "";

    useEffect(() => {
        const loadBoundary = async () => {
            try {
                const boundary = await service.getBoundaryImage(surveyId)
                setBoundaryImage(boundary.status === 'ready' ? boundary.url : null);
            } catch (e) {
                console.error("Error: unable to fetch boundary image", e)
            }
        }
        loadBoundary();
    }, [service, surveyId])

    const handleContinue = async () => {
        if (surveyor?.isLead) {
            navigation.navigate("WeatherConditionsScreen", { surveyId, surveyorId, locationId, type });
            return;
        }
        try {
            await goToLocationStep(service, navigation, surveyId, surveyorId);
        } catch (e) {
            console.error("Unable to continue to the location step", e);
        }
    }

    return (
        <View style={screen.justifyScreen} >
            <View style={{ width: "100%" }} >
                <ScreenHeader navigation={navigation} />
                <Title title="Confirm Surveyor Details" />
            </View>
            {surveyor && surveyor.name != null &&
                <ScrollView style={screen.scroll} contentContainerStyle={screen.scrollContent} keyboardShouldPersistTaps="handled">
                    <SummaryGroup groupTitle="Surveyor" summaryRows={[{ label: surveyor.isLead ? "Lead Surveyor" : `Surveyor`, value: surveyor?.name }]} />
                    <SummaryGroup
                        key="survey"
                        groupTitle="Survey"
                        summaryRows={[
                            {
                                label: "Survey Name",
                                value: displayValue(survey?.name)
                            },
                            {
                                label: "Postcode",
                                value: displayValue(survey?.postcode)
                            }
                        ]} />
                    <SummaryGroup
                        key="date & time"
                        groupTitle="Date & Time"
                        summaryRows={[
                            {
                                label: "Survey Date",
                                value: displayValue(survey?.date)
                            },
                            {
                                label: "Start Time",
                                value: displayValue(survey?.startTime, "time")
                            },
                            {
                                label: "End Time",
                                value: displayValue(survey?.endTime, "time")
                            },
                            {
                                label: "Sunrise/Sunset Time",
                                value: displayValue(survey?.sunsetTime, "time")
                            }
                        ]} />
                    <Text style={styles.summaryTitle}>Red Line Boundary</Text>
                    <DocumentPreview imageUri={boundaryImage} values={positions} emptyMessage="No red line boundary added by admin" />

                </ScrollView>}
            <View style={{ alignItems: "center", gap: 8 }} >
                <Button label="Continue" variant="light" onPress={handleContinue} />
                <InlineButton label="Doesn't look right?" onPress={() => navigation.navigate("InputCodeScreen")} />
            </View>
        </View >
    )
}

const styles = StyleSheet.create({
    summaryTitle: {
        ...textStyles.inputTitleText,
        textAlign: "left",
        width: "100%"
    }
})
