import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen";
import { StyleSheet, View } from "react-native";
import { ScreenHeader } from "@components/Common/ScreenHeader";
import { ButtonGroup } from "@components/Common/Button";
import { Title } from "@components/Common/Titles";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { Surveyor } from "@bapp/domain";
import { routeForSurveyor } from "@utils/surveyorRoute";
import { recordRecentSurvey } from "@services/recentSurveys";
import SurveyorIllustration from "@assets/illustrations/surveyors.svg"

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function SelectSurveyorScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId } = useRoute<RouteProp<SurveyorStackParamList, 'SelectSurveyorScreen'>>().params;
    const { context } = useActiveSurvey();
    const surveyors = context?.surveyors;

    const handleNavigate = (surveyor: Surveyor) => {
        if (!context) {
            navigation.navigate('ConfirmSurveyorDetailsScreen', { surveyId, surveyorId: surveyor.id });
            return;
        }
        void recordRecentSurvey(context.survey, "surveyor", surveyor.id);
        const route = routeForSurveyor(context, surveyor);
        navigation.navigate(route);
    }

    return (
        <View style={screen.justifyScreen} >
            <View style={{ width: "100%" }} >
                <ScreenHeader navigation={navigation} />
                <View style={styles.content} >
                    <SurveyorIllustration width={180} height={180} style={styles.illustration} />
                    <Title title="Select Surveyor" />
                    {surveyors &&
                        <ButtonGroup labels={
                            surveyors?.map((surveyor) => {
                                const name = surveyor.name ? surveyor.name : "Name not found";
                                return surveyor.isLead ? `Lead Surveyor: ${name}` : name;
                            })}
                            actions={"right arrow"}
                            onPress={surveyors?.map((surveyor) => () => handleNavigate(surveyor)) ?? []}
                        />
                    }
                </View>
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