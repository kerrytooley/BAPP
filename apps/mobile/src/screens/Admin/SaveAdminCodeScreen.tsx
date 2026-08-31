import { BackButton, Button } from "@components/Button";
import { Title } from "@components/Titles";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen";
import { colours } from "@theme/colours";
import { fonts, textStyles } from "@theme/fonts";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSurveyService } from "@services/surveyServiceContext";
import { CodeShare } from "@components/CodeShare";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function SaveAdminCodeScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId } = useRoute<RouteProp<AdminStackParamList, "SaveAdminCodeScreen">>().params;
    const service = useSurveyService();
    const [adminCode, setAdminCode] = useState<string>();

    useEffect(() => {
        const loadSurvey = async () => {
            try {
                const survey = await service.getSurvey(surveyId);
                setAdminCode(survey.adminCode);
            } catch (e) {
                console.error("failed to load survey", e);
            }
        };
        loadSurvey();
    }, [service, surveyId]);

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <BackButton navigation={navigation} />
                <Title title="Save Your Admin Code" subtitle="Keep this admin code safe. You'll need it later to access your survey results." />
            </View>
            <View style={styles.content}>
                <CodeShare value={adminCode} codeType="admin" />
            </View>
            <Button label="Continue" onPress={() => navigation.navigate("CreateSurvey", { surveyId })} />
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
    codeContainer: {
        backgroundColor: colours.inputBackground,
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: "center",
        justifyContent: "center",
    },
    codeText: {
        fontFamily: fonts.family.semiBold,
        fontSize: fonts.size.xxl,
        color: colours.light,
        letterSpacing: 3,
    },
    hint: {
        ...textStyles.inputText,
        color: colours.light,
        textAlign: "center",
    },
});
