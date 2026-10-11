import { ScreenHeader } from "@components/Common/ScreenHeader";
import { Button } from "@components/Common/Button";
import { CodeInput } from "@components/Interactive/CodeInput";
import { Title } from "@components/Common/Titles";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screen } from "@theme/screen";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import { useSurveyService } from "@services/surveyServiceContext";
import PadlockIllustration from "@assets/illustrations/padlock.svg"
import { isBlank, validateSurveyCode } from "@bapp/domain";
import { recordRecentSurvey } from "@services/recentSurveys";
import { ConfirmModal } from "@components/Modals/ConfirmModal";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function AdminCodeScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const [code, setCode] = useState('');
    const [notFound, setNotFound] = useState(false);
    const service = useSurveyService();
    const codeError = validateSurveyCode(code);
    // Only nag once the code is full length or has a character that can never be valid.
    const showCodeError = !!codeError && (code.trim().length >= 6 || /[^a-z0-9]/i.test(code.trim()));

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
                        <ScreenHeader navigation={navigation} />
                        <PadlockIllustration width={180} height={180} style={styles.illustration} />
                        <Title title="Enter Admin Code" subtitle="Enter the admin code for the survey you want to continue" />
                        <View >
                            <CodeInput testID="admin-code-input" placeholder="XXXXXX" value={code} onChangeText={setCode} error={showCodeError ? codeError : null} />
                        </View>
                    </View>
                    <Button
                        variant="light"
                        label="Continue"
                        disabled={isBlank(code) || !!codeError}
                        onPress={async () => {
                            try {
                                const { survey } = await service.resumeSurvey(code);
                                void recordRecentSurvey(survey, "admin");
                                navigation.navigate('SurveyStatusScreen', { surveyId: survey.id });
                            } catch (e) {
                                console.error("Error resuming survey:", e);
                                setNotFound(true);
                            }
                        }}
                    />
                </ScrollView>
            </KeyboardAvoidingView >
            <ConfirmModal
                visible={notFound}
                title="Survey not found"
                message="No survey matches that admin code. Please check and try again."
                confirmLabel="OK"
                onConfirm={() => setNotFound(false)}
            />
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
