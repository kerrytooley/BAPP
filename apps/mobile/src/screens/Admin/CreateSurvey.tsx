import { BackButton, Button } from "@components/Button";
import { InputField } from "@components/InputField";
import { Title } from "@components/Titles";
import { screen } from "@theme/screen";
import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { useSurveyService } from "@services/surveyServiceContext";
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

    const scrollRef = useRef<ScrollView>(null);
    const fieldY = useRef<Record<string, number>>({});

    const scrollToField = (key: string) => {
        const y = fieldY.current[key];
        if (y == null) return;
        setTimeout(() => {
            scrollRef.current?.scrollTo({ y: Math.max(y - 16, 0), animated: true });
        }, 100);
    };

    return (
        <View style={styles.screen}>
            <BackButton navigation={navigation} />
            <ScrollView ref={scrollRef} style={{ width: "100%" }} contentContainerStyle={screen.content} keyboardShouldPersistTaps="handled">
                <Title title="Create Survey" />
                <InputField fieldLabel="Survey Name" placeholderText="Input survey name" value={name} onChangeText={setName} />
                <InputField fieldLabel="Survey Postcode" placeholderText="Input survey postcode" value={postcode} onChangeText={setPostcode} />
                <View style={{ width: "100%" }} onLayout={(e) => { fieldY.current.date = e.nativeEvent.layout.y; }}>
                    <DatePickerInput fieldLabel="Survey Date" value={date} onChange={setDate} onOpen={() => scrollToField("date")} />
                </View>
                <View style={{ width: "100%" }} onLayout={(e) => { fieldY.current.start = e.nativeEvent.layout.y; }}>
                    <TimePickerInput fieldLabel="Start Time" value={startTime} onChange={setStartTime} onOpen={() => scrollToField("start")} />
                </View>
                <View style={{ width: "100%" }} onLayout={(e) => { fieldY.current.end = e.nativeEvent.layout.y; }}>
                    <TimePickerInput fieldLabel="End Time" value={endTime} onChange={setEndTime} onOpen={() => scrollToField("end")} />
                </View>
                <View style={{ width: "100%" }} onLayout={(e) => { fieldY.current.sunset = e.nativeEvent.layout.y; }}>
                    <TimePickerInput fieldLabel="Sunrise/Sunset Time" value={sunsetTime} onChange={setSunsetTime} onOpen={() => scrollToField("sunset")} />
                </View>
            </ScrollView>
            <Button
                variant="light"
                label="Continue"
                onPress={async () => {
                    try {
                        await service.updateSurvey(surveyId, {
                            name,
                            postcode,
                            date: date ?? null,
                            startTime: startTime ?? null,
                            endTime: endTime ?? null,
                            sunsetTime: sunsetTime ?? null,
                        });
                        navigation.navigate('UploadRedLineBoundaryScreen', { surveyId });
                    } catch (e) {
                        console.error('Error updating create survey fields: ', e);
                    }
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        ...screen.justifyScreen,
    }
});