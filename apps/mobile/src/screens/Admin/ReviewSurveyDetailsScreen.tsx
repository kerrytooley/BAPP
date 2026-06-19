import { BackButton, ButtonGroup } from "@components/Button";
import { SummaryGroup } from "@components/SummaryRow";
import { Title } from "@components/Titles";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screen } from "@theme/screen";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useSurveyService } from "@services/surveyServiceContext";
import { Survey, Surveyor } from "@bapp/domain";
import { formatTime } from "@utils/dateTimeUtils";

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

    useEffect(() => {
        const loadSurvey = async () => {
            try {
                const surveyContext = await service.getSurveyContext(surveyId);
                setSurvey(surveyContext.survey);
                setSurveyors(surveyContext.surveyors);
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
            <BackButton navigation={navigation} />
            <Title title="Review Survey Details" />
            <View style={styles.content}>
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
            </View>
            <ButtonGroup variant="mixed" labels={["Complete Survey Setup", "Save for Later"]} onPress={[]} />
        </View>
    )
}

const styles = StyleSheet.create({
    content: {
        ...screen.content,
        justifyContent: "flex-start",
        flex: 1,
        paddingVertical: 16
    }
})