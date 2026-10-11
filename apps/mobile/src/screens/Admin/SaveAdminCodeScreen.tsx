import { BackButton, Button } from "@components/Button";
import { Title } from "@components/Titles";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen";
import { colours } from "@theme/colours";
import { fonts, textStyles } from "@theme/fonts";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { CodeShare } from "@components/CodeShare";
import KeyIllustration from "@assets/illustrations/key.svg"

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function SaveAdminCodeScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId } = useRoute<RouteProp<AdminStackParamList, "SaveAdminCodeScreen">>().params;
    const { context } = useActiveSurvey();
    const adminCode = context?.survey.adminCode;

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <BackButton navigation={navigation} />
                <KeyIllustration width={180} height={180} style={styles.illustration} />
                <Title title="Save Your Admin Code" subtitle="Keep this admin code safe. You'll need it later to access your survey results." />
                <Text style={styles.hint}>Don't share this code. You'll get a different code later on to invite your surveyors to join. </Text>
            </View>
            <View style={styles.content}>
                <CodeShare value={adminCode} codeType="admin" />
            </View>
            <Button label="Continue" disabled={!adminCode} onPress={() => navigation.navigate('UploadRedLineBoundaryScreen', { surveyId })} />
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
        marginVertical: 24
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
        textAlign: "left",
        paddingTop: 24
    },
});
