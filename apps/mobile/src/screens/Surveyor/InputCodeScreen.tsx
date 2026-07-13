import { BackButton, Button } from "@components/Button";
import { CodeInput } from "@components/CodeInput";
import { Title } from "@components/Titles";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screen } from "@theme/screen";
import React, { useState } from "react"
import { useNavigation } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import { useSurveyService } from "../../services/surveyServiceContext";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function InputCodeScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const [code, setCode] = useState('');
    const service = useSurveyService();

    return (
        <View style={styles.screen}>
            <View style={{ width: "100%" }}>
                <BackButton navigation={navigation} />
                <Title title="Input Survey Code" subtitle="Join survey by entering code shared by lead surveyor" />
            </View>
            <View style={styles.content}>
                <CodeInput testID="survey-code-input" placeholder="XXXXXX" value={code} onChangeText={setCode} />
            </View>
            <Button
                variant="light"
                label="Continue"
                onPress={async () => {
                    try {
                        const surveyContext = await service.joinSurvey(code);

                        console.log(`Found survey using surveyor code: ${code}. Survey Context:`, surveyContext);
                        navigation.navigate('CodeConfirmationScreen', { surveyId: surveyContext.survey.id });
                    } catch (e) {
                        console.error(`Error joining survey for surveyor code ${code}:`, e);
                    }
                }
                }
            />
        </View>
    )
}

const styles = StyleSheet.create({
    screen: {
        ...screen.justifyScreen,
    },
    content: {
        ...screen.content,
        position: 'absolute',
        top: '50%'
    }
})

