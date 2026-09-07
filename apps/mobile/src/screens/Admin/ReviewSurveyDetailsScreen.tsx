import { BackButton, ButtonGroup } from "@components/Common/Button";
import { SummaryGroup } from "@components/Display/SummaryRow";
import { Title } from "@components/Common/Titles";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screen } from "@theme/screen";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useSurveyService } from "@services/surveyServiceContext";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { DocumentPreview } from "@components/Display/DocumentPreview";
import { textStyles } from "@theme/fonts";
import { displayValue } from "@utils/displayValue";

type Nav = NativeStackNavigationProp<AdminStackParamList>;


export function ReviewSurveyDetailsScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId } = useRoute<RouteProp<AdminStackParamList, "ReviewSurveyDetailsScreen">>().params;
    const service = useSurveyService();
    const { context } = useActiveSurvey();

    const survey = context?.survey;
    const surveyors = context?.surveyors;
    const positions = context?.locations.flatMap((location) => location.boundaryPosition ?? []) ?? [];
    const [boundaryImage, setBoundaryImage] = useState<string | null>();

    useEffect(() => {
        const loadBoundary = async () => {
            try {
                const boundary = await service.getBoundaryImage(surveyId)
                setBoundaryImage(boundary.status === 'ready' ? boundary.url : null);
            } catch (e) {
                console.error('failed to fetch survey', e)
            }
        };
        loadBoundary();
    }, [service, surveyId])

    const getSurveyorArray = () => {
        let nonLeadIndex = 0;
        return (surveyors ?? []).map((s) => ({
            label: s.isLead ? "Lead Surveyor" : `Surveyor ${++nonLeadIndex}`,
            value: displayValue(s.name)
        }));
    }

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <BackButton navigation={navigation} />
                <Title title="Review Survey Details" />
            </View>

            <ScrollView style={screen.scroll} contentContainerStyle={screen.scrollContent} keyboardShouldPersistTaps="handled">
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
                <SummaryGroup
                    key="surveyors"
                    groupTitle="Surveyors"
                    summaryRows={
                        getSurveyorArray()
                    } />
                <Text style={styles.summaryTitle}>Red Line Boundary</Text>
                <DocumentPreview imageUri={boundaryImage} values={positions} />
            </ScrollView>
            <ButtonGroup variant="mixed" labels={[
                "Complete Survey Setup",
                "Save for Later"]}
                onPress={[
                    () => navigation.navigate("ShareCodeScreen", { surveyId }),
                    () => navigation.navigate("SurveySavedScreen")
                ]} />
        </View>
    )
}

const styles = StyleSheet.create({
    summaryTitle: {
        ...textStyles.inputTitleText,
        textAlign: "left",
        width: "100%"
    }
})