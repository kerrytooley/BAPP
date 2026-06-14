import { BackButton, Button } from "@components/Button";
import { DateInput } from "@components/DateInput";
import { InputField } from "@components/InputField";
import { TimeInput } from "@components/TimeInput";
import { Title } from "@components/Titles";
import { screen } from "@theme/screen";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { useSurveyService } from "../../services/surveyServiceContext";
import { DatePickerInput } from "@components/DatePickerInput";
import { TimePickerInput } from "@components/TimePickerInput";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function CreateSurvey(): React.JSX.Element {
    const service = useSurveyService();
    const { surveyId } = useRoute<RouteProp<AdminStackParamList, 'CreateSurvey'>>().params;

    const navigation = useNavigation<Nav>();
    const [name, setName] = useState('');
    const [postcode, setPostcode] = useState('');
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [startTime, setStartTime] = useState<Date | undefined>(undefined);
    const [endTime, setEndTime] = useState<Date | undefined>(undefined);
    const [sunsetTime, setSunsetTime] = useState<Date | undefined>(undefined);

    return (
        <View style={styles.screen}>
            <BackButton navigation={navigation} />
            <View style={screen.content}>
                <Title title="Create Survey" />
                <InputField fieldLabel="Survey Name" placeholderText="Input survey name" value={name} onChangeText={setName} />
                <InputField fieldLabel="Survey Postcode" placeholderText="Input survey postcode" value={postcode} onChangeText={setPostcode} />
                <DatePickerInput fieldLabel="SurveyDate" value={date} onChange={setDate} />
                <TimePickerInput fieldLabel="Start Time" value={startTime} onChange={setStartTime} />
                <TimePickerInput fieldLabel="End Time" value={endTime} onChange={setEndTime} />
                <TimePickerInput fieldLabel="Sunrise/Sunset Time" value={sunsetTime} onChange={setSunsetTime} />
            </View>
            <Button variant="light" label="Continue" onPress={() => {
                try {
                    service.updateSurvey(surveyId, {
                        name: name, postcode: postcode, date: date, startTime: startTime, endTime: endTime, sunsetTime: sunsetTime
                    })
                        .then((survey) => console.log('Updating create survey details:', survey))
                    navigation.navigate('UploadRedLineBoundaryScreen', { surveyId })
                } catch (e) {
                    console.error('Error updating create survey fields: ', e)
                }
            }} />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        ...screen.justifyScreen,
        overflow: "scroll"
    }
});