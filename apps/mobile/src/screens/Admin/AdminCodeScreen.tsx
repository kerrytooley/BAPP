import { BackButton, Button } from "@components/Button";
import { CodeInput } from "@components/CodeInput";
import { Title } from "@components/Titles";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screen } from "@theme/screen";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Alert, StyleSheet, View } from "react-native";
import { useSurveyService } from "@services/surveyServiceContext";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function AdminCodeScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const [code, setCode] = useState('');
    const service = useSurveyService();

    return (
        <View style={styles.screen}>
            <View style={{ width: "100%" }}>
                <BackButton navigation={navigation} />
                <Title title="Enter Admin Code" subtitle="Enter the admin code for the survey you want to continue" />
            </View>
            <View style={styles.content}>
                <CodeInput testID="admin-code-input" placeholder="XXXXXX" value={code} onChangeText={setCode} />
            </View>
            <Button
                variant="light"
                label="Continue"
                onPress={async () => {
                    try {
                        const { survey } = await service.resumeSurvey(code);
                        navigation.navigate('SurveyStatusScreen', { surveyId: survey.id });
                    } catch (e) {
                        console.error(`Error resuming survey for admin code ${code}:`, e);
                        Alert.alert("Survey not found", "No survey matches that admin code. Please check and try again.");
                    }
                }}
            />
        </View>
    );
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
});
