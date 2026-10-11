import { Title } from "@components/Titles";
import { screen } from "@theme/screen";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { BackButton, Button, InlineButton } from "@components/Button";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { formatDate } from "@utils/dateTimeUtils";
import ClipboardIllustration from "@assets/illustrations/clipboard.svg"
import { textStyles } from "@theme/fonts";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function CodeConfirmationScreen(
): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId } = useRoute<RouteProp<SurveyorStackParamList, 'CodeConfirmationScreen'>>().params;

    const { context } = useActiveSurvey();
    const survey = context?.survey;

    const surveyTitle = survey?.name && survey?.postcode
        ? `${survey.name} - ${survey.postcode}`
        : "Survey name not found";


    const surveyDate = survey?.date ? formatDate(survey.date) : "Survey date not found";

    return (
        <View style={styles.screen}>
            <View style={{ width: "100%", gap: 24 }}>
                <BackButton navigation={navigation} />
                <ClipboardIllustration width={180} height={180} style={styles.illustration} />
                <Title testID="confirmation-heading" title="You are joining:" />
                <View style={{ paddingVertical: 24 }}>
                    <Text testID="confirmation-survey-title" style={styles.text}>{surveyTitle}</Text>
                    <Text testID="confirmation-survey-date" style={styles.text}>{surveyDate.toString()} </Text>
                </View>
            </View>

            <View style={{ alignItems: "center", gap: 16 }}>
                <Button label="Continue" variant="light" onPress={() => navigation.navigate("SelectSurveyorScreen", { surveyId })} />
                <InlineButton label="Doesn't look right?" onPress={navigation.goBack} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        ...screen.justifyScreen,
    },
    content: {
        ...screen.content
    },
    illustration: {
        alignSelf: "center",
    },
    text: {
        ...textStyles.title,
        textAlign: "center"
    }
})