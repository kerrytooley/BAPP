import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { screen } from "@theme/screen";
import { textStyles } from "@theme/fonts";
import { colours } from "@theme/colours";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { ScreenHeader } from "@components/Common/ScreenHeader";
import { ButtonGroup } from "@components/Common/Button";
import { Title } from "@components/Common/Titles";
import { Card } from "@components/Common/Card";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { getIncompleteSetupSteps } from "@utils/setupProgress";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function SetupIncompleteScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, surveyorId, locationId } = useRoute<RouteProp<SurveyorStackParamList, "SetupIncompleteScreen">>().params;
    const { context } = useActiveSurvey();
    const steps = context ? getIncompleteSetupSteps(context, surveyorId) : [];

    const completeSetup = () => {
        const [first] = steps;
        if (first) navigation.navigate(first.route);
    };

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <ScreenHeader navigation={navigation} />
                <Title
                    title="Your survey setup is incomplete"
                    subtitle="Would you like to complete your setup now, or return to your survey?"
                />
            </View>
            <View style={styles.content}>
                {steps.length > 0 &&
                    <Card cardLabel="Still to do">
                        {steps.map((step) => (
                            <Text key={step.label} style={styles.step}>{`\u2022 ${step.label}`}</Text>
                        ))}
                    </Card>
                }
            </View>
            <ButtonGroup
                variant="mixed"
                labels={["Complete setup", "Return to survey"]}
                disabled={[steps.length === 0, false]}
                onPress={[
                    completeSetup,
                    () => navigation.navigate("SurveyScreen", { surveyId, surveyorId, locationId }),
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        ...screen.content,
        flex: 1,
        justifyContent: "flex-start",
        paddingTop: 24,
    },
    step: {
        ...textStyles.inputText,
        color: colours.light,
    },
});
