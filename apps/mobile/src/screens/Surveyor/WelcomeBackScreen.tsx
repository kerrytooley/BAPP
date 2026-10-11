import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen";
import { StyleSheet, View } from "react-native";
import { ScreenHeader } from "@components/Common/ScreenHeader";
import { Button, InlineButton } from "@components/Common/Button";
import { Title } from "@components/Common/Titles";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { routeForSurveyor } from "@utils/surveyorRoute";
import SurveyorIllustration from "@assets/illustrations/surveyors.svg"

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function WelcomeBackScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, surveyorId } = useRoute<RouteProp<SurveyorStackParamList, 'WelcomeBackScreen'>>().params;
    const { context } = useActiveSurvey();
    const surveyor = context?.surveyors.find((s) => s.id === surveyorId);
    const name = surveyor?.name?.trim();

    const changeSurveyor = () => navigation.navigate("SelectSurveyorScreen", { surveyId });

    const handleContinue = () => {
        // The remembered surveyor may have been removed by the admin since.
        if (!context || !surveyor) {
            changeSurveyor();
            return;
        }
        navigation.navigate(routeForSurveyor(context, surveyor));
    };

    return (
        <View style={screen.justifyScreen} >
            <View style={{ width: "100%" }} >
                <ScreenHeader navigation={navigation} />
                <View style={styles.content} >
                    <SurveyorIllustration width={180} height={180} style={styles.illustration} />
                    <Title
                        testID="welcome-back-heading"
                        title={name ? `Welcome back ${name}` : "Welcome back"}
                        subtitle="Continue where you left off"
                    />
                </View>
            </View>
            <View style={{ alignItems: "center", gap: 16 }}>
                <Button label="Continue" variant="light" disabled={!context} onPress={handleContinue} />
                <InlineButton label="Change surveyor" onPress={changeSurveyor} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        paddingVertical: 48,
        gap: 48
    },
    illustration: {
        alignSelf: "center",
    },
})
