import { ScreenHeader } from "@components/Common/ScreenHeader";
import { Button } from "@components/Common/Button";
import { RootStackParamList } from "@navigators/index";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp, useNavigation } from "@react-navigation/native";
import { screen } from "@theme/screen";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Title } from "@components/Common/Titles";
import { CodeShare } from "@components/Interactive/CodeShare";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import SurveyorIllustration from "@assets/illustrations/surveyors.svg"

type Nav = CompositeNavigationProp<
    NativeStackNavigationProp<AdminStackParamList>,
    NativeStackNavigationProp<RootStackParamList>
>;

export function ShareCodeScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { context } = useActiveSurvey();
    const surveyorCode = context?.survey.surveyorCode;

    return (
        <View style={screen.justifyScreen} >
            <View style={{ width: "100%" }} >
                <View style={styles.header}>
                    <ScreenHeader navigation={navigation} />
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