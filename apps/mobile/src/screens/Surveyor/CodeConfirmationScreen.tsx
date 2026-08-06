import { Title } from "@components/Titles";
import { screen } from "@theme/screen";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSurveyService } from "@services/surveyServiceContext";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { BackButton, Button, InlineButton } from "@components/Button";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Survey } from "@bapp/domain";
import { formatDate } from "@utils/dateTimeUtils";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function CodeConfirmationScreen(
): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId } = useRoute<RouteProp<SurveyorStackParamList, 'CodeConfirmationScreen'>>().params;

    const service = useSurveyService();
    const [survey, setSurvey] = useState<Survey>();

    useEffect(() => {
        const loadSurvey = async () => {
            try {
                const { survey } = await service.getSurveyContext(surveyId);
                setSurvey(survey);
            } catch (e) {
                console.error('getSurveyContext failed:', e);
            }
        };

        loadSurvey();
    }, [service, surveyId])

    const surveyTitle = survey?.name && survey?.postcode
        ? `${survey.name} - ${survey.postcode}`
        : "Survey name not found";


    const surveyDate = survey?.date ? formatDate(survey.date) : "Survey date not found";

    return (
        <View style={styles.screen}>
            <View style={{ width: "100%" }}>
                <BackButton navigation={navigation} />
                <Title testID="confirmation-heading" title="You are joining:" />
            </View>
            <View style={styles.content}>
                <Title testID="confirmation-survey-title" title={surveyTitle} />
                <Title testID="confirmation-survey-date" title={surveyDate.toString()} />
            </View>
            <View style={{ alignItems: "center", gap: 16 }}>
                <Button label="Continue" variant="light" onPress={() => navigation.navigate("SelectSurveyorScreen", { surveyId })} />
                <InlineButton label="Doesn't look right?" onPress={navigation.goBack} /></View>

        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        ...screen.justifyScreen,
    },
    content: {
        ...screen.content,
        position: 'absolute',
        top: '50%'
    }
})