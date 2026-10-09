import React from "react";
import { StyleSheet, View } from "react-native";
import { screen } from "@theme/screen";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { ScreenHeader } from "@components/Common/ScreenHeader";
import { ButtonGroup } from "@components/Common/Button";
import { Title } from "@components/Common/Titles";
import { RootStackParamList } from "@navigators/index";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import SavedIllustration from "@assets/illustrations/saved.svg"

type Nav = CompositeNavigationProp<
    NativeStackNavigationProp<SurveyorStackParamList>,
    NativeStackNavigationProp<RootStackParamList>
>;

/** The only place a surveyor can reach once they've ended their survey: read-only from here. */
export function SurveyorCompleteScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, surveyorId, locationId } = useRoute<RouteProp<SurveyorStackParamList, "SurveyorCompleteScreen">>().params;

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <ScreenHeader navigation={navigation} />
            </View>
            <View style={styles.content}>
                <SavedIllustration width={240} height={240} style={styles.illustration} />
                <Title
                    title="Survey completed"
                    subtitle="Your survey has been completed and sent to the survey admin. Contact your admin if you need to make any changes."
                />
            </View>
            <ButtonGroup
                variant="mixed"
                labels={["Review your results", "Return Home"]}
                onPress={[
                    () => navigation.navigate("SurveySummaryScreen", { surveyId, surveyorId, locationId, viewOnly: true }),
                    () => navigation.navigate("Welcome"),
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        ...screen.content,
        justifyContent: "center",
        flex: 1,
        gap: 24,
    },
    illustration: {
        alignSelf: "center",
    },
});
