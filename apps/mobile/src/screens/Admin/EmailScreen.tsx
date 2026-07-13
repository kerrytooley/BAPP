import React, { useState } from "react";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StyleSheet, View } from "react-native"
import { screen } from "@theme/screen";
import { Title } from "@components/Titles";
import { InputField } from "@components/InputField";
import { BackButton, Button } from "@components/Button";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { useSurveyService } from "@services/surveyServiceContext"
type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function EmailScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId } = useRoute<RouteProp<AdminStackParamList, 'EmailScreen'>>().params;
    const service = useSurveyService();
    const [email, setEmail] = useState('');

    return (
        <View style={styles.screen}>
            <View>
                <BackButton navigation={navigation} />
                <Title title="Enter Email Address" subtitle="Enter the email address to send the completed survey report to." />
            </View>
            <View style={styles.content}>
                <InputField testID="email-input" fieldLabel="Email Address" placeholderText="Input email address" value={email} onChangeText={setEmail} />
            </View>
            <Button
                variant="light"
                label="Continue"
                onPress={async () => {
                    try {
                        const { survey } = await service.getSurveyContext(surveyId);
                        await service.updateSurvey(surveyId, { data: { ...survey.data, adminEmail: email } })
                            .then((survey) => console.log('Admin email address updated:', survey));
                        navigation.navigate('CreateSurvey', { surveyId });
                    } catch (e) {
                        console.error('updateSurvey failed:', e);
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
        position: "absolute",
        top: "40%"
    }
})