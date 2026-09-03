import { BackButton, Button } from "@components/Button";
import { RootStackParamList } from "@navigators/index";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Title } from "@components/Titles";
import { CodeShare } from "@components/CodeShare";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { useSurveyService } from "@services/surveyServiceContext";
import SurveyorIllustration from "@assets/illustrations/surveyors.svg"

type Nav = CompositeNavigationProp<
    NativeStackNavigationProp<AdminStackParamList>,
    NativeStackNavigationProp<RootStackParamList>
>;

export function ShareCodeScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId } = useRoute<RouteProp<AdminStackParamList, "ShareCodeScreen">>().params;
    const service = useSurveyService();
    const [surveyorCode, setSurveyorCode] = useState<string>();

    useEffect(() => {
        const loadSurvey = async () => {
            try {
                const surveyContext = service.getSurveyContext(surveyId)
                setSurveyorCode((await surveyContext).survey.surveyorCode)
            } catch (e) {
                console.error("failed to load survey", e)
            }
        }
        loadSurvey();
    }, [service, surveyId])

    return (
        <View style={screen.justifyScreen} >
            <View style={{ width: "100%" }} >
                <View style={styles.header}>
                    <BackButton navigation={navigation} />
                </View>
                <SurveyorIllustration width={180} height={180} style={styles.illustration} />
                <Title title="Share Your Survey Code" subtitle="Share this surveyor code with your team to invite them to the survey." />
            </View>
            <View style={styles.content} >
                <CodeShare value={surveyorCode} codeType='surveyor' />
            </View>
            <Button label="Return Home" variant="light" onPress={() => navigation.navigate("Welcome")} />
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center"
    },
    content: {
        ...screen.content,
        justifyContent: "center",
        flex: 1
    },
    illustration: {
        alignSelf: "center",
        marginVertical: 24
    },

})