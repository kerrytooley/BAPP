import { ScreenHeader } from "@components/Common/ScreenHeader";
import { Button } from "@components/Common/Button";
import { CodeInput } from "@components/Interactive/CodeInput";
import { Title } from "@components/Common/Titles";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screen } from "@theme/screen";
import React, { useState } from "react"
import { useNavigation } from "@react-navigation/native";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import { useSurveyService } from "../../services/surveyServiceContext";
import PadlockIllustration from "@assets/illustrations/padlock.svg"
import { isBlank, validateSurveyCode } from "@bapp/domain";
import { recordRecentSurvey } from "@services/recentSurveys";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function InputCodeScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const [code, setCode] = useState('');
    const service = useSurveyService();
    const codeError = validateSurveyCode(code);
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
                        <Title title="Input Survey Code" subtitle="Join survey by entering code shared by lead surveyor" />

                        <CodeInput testID="survey-code-input" placeholder="XXXXXX" value={code} onChangeText={setCode} error={showCodeError ? codeError : null} />
                    </View>
                    <Button
                        variant="light"
                        label="Continue"
                        disabled={isBlank(code) || !!codeError}
                        onPress={async () => {
                            try {
                                const surveyContext = await service.joinSurvey(code);
                                void recordRecentSurvey(surveyContext.survey, "surveyor");

                                console.log(`Found survey using surveyor code: ${code}. Survey Context:`, surveyContext);
                                navigation.navigate('CodeConfirmationScreen', { surveyId: surveyContext.survey.id });
                            } catch (e) {
                                console.error(`Error joining survey for surveyor code ${code}:`, e);
                            }
                        }
                        }
                    />
                </ScrollView>
            </KeyboardAvoidingView >
        </View>
    )
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
