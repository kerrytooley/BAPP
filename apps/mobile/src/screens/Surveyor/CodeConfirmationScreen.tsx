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
            const { survey } = await service.getSurveyContext(surveyId);
            setSurvey(survey);
        };

        loadSurvey();
    }, [service, surveyId])

    const surveyTitle = survey?.name && survey?.postcode
        ? `${survey.name} - ${survey.postcode}`
        : "Survey name not found";


    const surveyDate = survey?.date ? formatDate(survey.date) : "Survey date not found";

    return (
        <View style={styles.screen}>
            <BackButton navigation={navigation} />
            <Title title="You are joining:" />
            <View style={styles.content}>
                <Title title={surveyTitle} />
                <Title title={surveyDate.toString()} />
            </View>
            <View style={{ alignItems: "center", gap: 16 }}>
                <Button label="Continue" variant="light" onPress={() => { }} />
                <InlineButton label="Doesn't look right?" onPress={navigation.goBack} /></View>

        </View>
    );
}

function isSurvey(survey: Survey) {
    if (survey &&
        survey.id &&
        survey.name &&
        survey.postcode &&
        survey.date) {
        return true
    }
    return false
}

const styles = StyleSheet.create({
    screen: {
        ...screen.justifyScreen,
        paddingTop: 120
    },
    content: {
        ...screen.content,
        position: 'absolute',
        top: '50%'
    }
})