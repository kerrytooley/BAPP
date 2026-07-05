import { BackButton, ButtonGroup } from "@components/Button";
import { SummaryGroup } from "@components/SummaryRow";
import { Title } from "@components/Titles";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screen } from "@theme/screen";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useSurveyService } from "@services/surveyServiceContext";
import { Survey, Surveyor } from "@bapp/domain";
import { formatTime } from "@utils/dateTimeUtils";
import { DocumentPreview } from "@components/DocumentPreview";
import { textStyles } from "@theme/fonts";

// TODO: red line boundary summary

type Nav = NativeStackNavigationProp<AdminStackParamList>;

const displayValue = (value?: string | Date | null, format?: string): string | Date =>
    value instanceof Date && format == "time"
        ? formatTime(value)
        : value || "N/A";


export function ReviewSurveyDetailsScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId } = useRoute<RouteProp<AdminStackParamList, "ReviewSurveyDetailsScreen">>().params;
    const service = useSurveyService();

    const [survey, setSurvey] = useState<Survey>();
    const [surveyors, setSurveyors] = useState<Surveyor[]>();
    const [boundaryImage, setBoundaryImage] = useState<string | null>();

    useEffect(() => {
        const loadSurvey = async () => {
            try {
                const surveyContext = await service.getSurveyContext(surveyId);
                setSurvey(surveyContext.survey);
                setSurveyors(surveyContext.surveyors);
                const imageUrl = await service.getBoundaryImageUrl(surveyId)
                setBoundaryImage(imageUrl);
            } catch (e) {
                console.error('failed to fetch survey', e)
            }
        };
        loadSurvey();
    }, [service, surveyId])

    const getSurveyorArray = () => {
        return surveyors?.map((s) => {
            return {
                label: s.isLead ? "Lead Surveyor" : `Surveyor ${surveyors.indexOf(s)}`,
                value: displayValue(s.name)
            }
        }) ?? []
    }

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <BackButton navigation={navigation} />
                <Title title="Review Survey Details" />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
                <Text style={textStyles.inputTitleText}>Red Line Boundary</Text>
                <DocumentPreview value={boundaryImage} />
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
    scroll: {
        width: '100%',
        flex: 1,
    },
    scrollContent: {
        ...screen.content,
        justifyContent: "flex-start",
        flexGrow: 1,
        paddingVertical: 16
    }
})