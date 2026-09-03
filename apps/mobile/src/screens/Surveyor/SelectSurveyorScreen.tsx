import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen";
import { StyleSheet, View } from "react-native";
import { BackButton, ButtonGroup } from "@components/Button";
import { Title } from "@components/Titles";
import { Surveyor } from "@bapp/domain";
import { useEffect, useState } from "react";
import { useSurveyService } from "@services/surveyServiceContext";
import SurveyorIllustration from "@assets/illustrations/surveyors.svg"

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function SelectSurveyorScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const service = useSurveyService();
    const { surveyId } = useRoute<RouteProp<SurveyorStackParamList, 'SelectSurveyorScreen'>>().params;
    const [surveyors, setSurveyors] = useState<Surveyor[]>();

    useEffect(() => {
        const loadSurveyors = async () => {
            try {
                const surveyContext = await service.getSurveyContext(surveyId);
                setSurveyors(surveyContext.surveyors)
            } catch (e) {
                console.error("Error: unable to fetch surveyors")
            }
        }
        loadSurveyors();
    }, [service, surveyId])

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
                            onPress={
                                surveyors.map((surveyor) => {
                                    const surveyorId = surveyor.id;
                                    return () => navigation.navigate('ConfirmSurveyorDetailsScreen', { surveyId, surveyorId })
                                }
                                )
                            }
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