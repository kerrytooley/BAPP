import React, { useState } from "react";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StyleSheet, View } from "react-native"
import { screen } from "@theme/screen";
import { Title } from "@components/Titles";
import { InputField } from "@components/InputField";
import { BackButton, Button } from "@components/Button";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { useSurveyService } from "../services/survey-service-context";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function EmailScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId } = useRoute<RouteProp<AdminStackParamList, 'EmailScreen'>>().params;
    const service = useSurveyService();
    const [email, setEmail] = useState('');

    return (
        <View style={styles.screen}>
            <BackButton navigation={navigation} />
            <View style={styles.content}>
                <Title title="Enter Email Address" subtitle="Enter the email address to send the completed survey report to." />
                <InputField fieldLabel="Email Address" placeholderText="Input email address" value={email} onChangeText={setEmail} />
            </View>
            <Button variant="light" label="Continue" onPress={() => {
                service.updateSurvey(surveyId,
                    { data: { adminEmail: email } }
                ).then(survey => {
                    console.log('Survey updated:', survey);
                    navigation.navigate('CreateSurvey', { surveyId })
                })
            }} />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        ...screen.baseScreen,
        paddingTop: 160,
        paddingHorizontal: 24,
        paddingBottom: 48,
        justifyContent: 'space-between',
    },
    content: {
        gap: 80,
        width: '100%',
        alignItems: 'center',
    }
})