import { BackButton, Button } from "@components/Common/Button";
import { CodeInput } from "@components/Interactive/CodeInput";
import { Title } from "@components/Common/Titles";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screen } from "@theme/screen";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSurveyService } from "@services/surveyServiceContext";
import PadlockIllustration from "@assets/illustrations/padlock.svg"
import { colours } from "@theme/colours";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function AdminCodeScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const [code, setCode] = useState('');
    const service = useSurveyService();

    return (
        <View style={screen.justifyScreen} >
            <KeyboardAvoidingView
                style={styles.codeView}
                behavior="height"
            >
                <ScrollView
                    style={screen.scroll}
                    contentContainerStyle={screen.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="interactive"
                >
                    <View style={styles.content}>
                        <BackButton navigation={navigation} />
                        <PadlockIllustration width={180} height={180} style={styles.illustration} />
                        <Title title="Enter Admin Code" subtitle="Enter the admin code for the survey you want to continue" />
                        <View >
                            <CodeInput testID="admin-code-input" placeholder="XXXXXX" value={code} onChangeText={setCode} />
                        </View>
                    </View>
                    <Button
                        variant="light"
                        label="Continue"
                        onPress={async () => {
                            try {
                                const { survey } = await service.resumeSurvey(code);
                                navigation.navigate('SurveyStatusScreen', { surveyId: survey.id });
                            } catch (e) {
                                console.error("Error resuming survey:", e);
                                Alert.alert("Survey not found", "No survey matches that admin code. Please check and try again.");
                            }
                        }}
                    />
                </ScrollView>
            </KeyboardAvoidingView >
        </View>

    );
}

const styles = StyleSheet.create({
    content: {
        ...screen.content,
        justifyContent: "flex-start",
        flex: 1,
        gap: 48
    },
    codeView: {
        flex: 1,
        justifyContent: "center",
    },
    illustration: {
        alignSelf: "center",
    },
    scrollContent: {
        ...screen.scrollContent,
        height: "100%"
    }
});
