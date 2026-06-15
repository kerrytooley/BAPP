import { BackButton, ButtonGroup } from "@components/Button";
import { Title } from "@components/Titles";
import { screen } from "@theme/screen";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { useSurveyService } from "@services/surveyServiceContext";

//TODO: add code input for continue exisitng survey

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function BeginOrContinueSurveyScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const service = useSurveyService()

    return (
        <View style={screen.justifyScreen}>
            <BackButton navigation={navigation} />
            <Title title="Begin or continue a survey" subtitle="Start a new survey or pick up where you left with an existing one" />
            <View style={styles.content}>
                <ButtonGroup
                    labels={['Begin a new survey', 'Continue existing survey']}
                    actions={["right arrow", "right arrow"]}
                    onPress={[
                        () => {
                            service.createSurvey()
                                .then(survey => {
                                    console.log('Survey created:', survey);
                                    navigation.navigate('EmailScreen',
                                        { surveyId: survey.id });
                                })
                                .catch(e => console.error('createSurvey failed:', e));
                        },
                        () => { },
                    ]} />
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        ...screen.baseScreen,
    },
    content: {
        ...screen.content,
        position: "absolute",
        top: "50%"
    }
})