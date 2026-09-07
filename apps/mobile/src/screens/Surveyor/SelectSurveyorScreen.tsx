import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen";
import { StyleSheet, View } from "react-native";
import { BackButton, ButtonGroup } from "@components/Common/Button";
import { Title } from "@components/Common/Titles";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { Surveyor } from "@bapp/domain";
import SurveyorIllustration from "@assets/illustrations/surveyors.svg"

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function SelectSurveyorScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId } = useRoute<RouteProp<SurveyorStackParamList, 'SelectSurveyorScreen'>>().params;
    const { context } = useActiveSurvey();
    const surveyors = context?.surveyors;

    const handleNavigate = (surveyor: Surveyor) => {
        if (surveyor.status === "ready" && surveyor.locationId) {
            navigation.navigate('SurveyScreen',
                {
                    surveyId,
                    locationId: surveyor.locationId,
                    surveyorId: surveyor.id
                })
        } else if (surveyor.status === "confirmed" && surveyor.locationId) {
            navigation.navigate('CapturePhotoScreen',
                {
                    surveyId,
                    locationId: surveyor.locationId,
                    surveyorId: surveyor.id,
                    photoType: 'frontView'
                })
        } else {
            navigation.navigate('ConfirmSurveyorDetailsScreen',
                {
                    surveyId,
                    surveyorId: surveyor.id
                })
        }
    }

    return (
        <View style={screen.justifyScreen} >
            <View style={{ width: "100%" }} >
                <BackButton navigation={navigation} />
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