import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BackButton, Button, InlineButton } from "@components/Button";
import { Title } from "@components/Titles";
import { Survey, Surveyor } from "@bapp/domain";
import { useEffect, useState } from "react";
import { useSurveyService } from "@services/surveyServiceContext";
import { SummaryGroup } from "@components/SummaryRow";
import { displayValue } from "@utils/displayValue";
import { DocumentPreview } from "@components/DocumentPreview";
import { textStyles } from "@theme/fonts";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function ConfirmSurveyorDetailsScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const service = useSurveyService();
    const { surveyId, surveyorId } = useRoute<RouteProp<SurveyorStackParamList, 'ConfirmSurveyorDetailsScreen'>>().params;
    const [surveyor, setSurveyor] = useState<Surveyor>();
    const [survey, setSurvey] = useState<Survey>();
    const [boundaryImage, setBoundaryImage] = useState<string | null>();

    useEffect(() => {
        const loadSurveyor = async () => {
            try {
                const surveyContext = await service.getSurveyContext(surveyId);
                const currentSurveyor = surveyContext.surveyors.find((surveyor) => surveyor?.id == surveyorId)
                setSurveyor(currentSurveyor);
                setSurvey(surveyContext.survey);
                const boundary = await service.getBoundaryImage(surveyId)
                setBoundaryImage(boundary.status === 'ready' ? boundary.url : null);
            } catch (e) {
                console.error("Error: unable to fetch survey context", e)
            }
        }
        loadSurveyor();
    }, [service, surveyId])

    return (
        <View style={screen.justifyScreen} >
            <View style={{ width: "100%" }} >
                <BackButton navigation={navigation} />
                <Title title="Confirm Surveyor Details " />
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
                    <DocumentPreview value={boundaryImage} />

                </ScrollView>}
            <View style={{ gap: 8 }} >
                <Button label="Continue" variant="light" onPress={() =>
                    surveyor?.isLead ? navigation.navigate("WeatherCondtionsScreen", { surveyId, surveyorId }) :
                        navigation.navigate("SurveyorConfirmLocationScreen", { surveyId, surveyorId })} />
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
