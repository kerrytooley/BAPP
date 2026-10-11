import { ScreenHeader } from "@components/Common/ScreenHeader";
import { Button, ButtonGroup } from "@components/Common/Button";
import { InputField } from "@components/Common/InputField";
import { Title } from "@components/Common/Titles";
import { screen } from "@theme/screen";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { useSurveyService } from "@services/surveyServiceContext";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { DatePickerInput } from "@components/DateTime/DatePickerInput";
import { TimePickerInput } from "@components/DateTime/TimePickerInput";
import { validatePostcode, validateRequiredText, validateSurveyEnd, validateSurveyStart } from "@bapp/domain";
import { recordRecentSurvey } from "@services/recentSurveys";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function CreateSurvey(): React.JSX.Element {
    const service = useSurveyService();
    const navigation = useNavigation<Nav>();
    const editParams = useRoute<RouteProp<AdminStackParamList, "CreateSurvey">>().params;
    const editing = editParams?.editing === true;
    const { context } = useActiveSurvey();

    const [name, setName] = useState('');
    const [postcode, setPostcode] = useState('');
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [startTime, setStartTime] = useState<Date | undefined>(undefined);
    const [endTime, setEndTime] = useState<Date | undefined>(undefined);
    const [sunsetTime, setSunsetTime] = useState<Date | undefined>(undefined);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [nameTouched, setNameTouched] = useState(false);
    const [postcodeTouched, setPostcodeTouched] = useState(false);
    const [originalTiming, setOriginalTiming] = useState<{ date?: number; start?: number }>({});
    const nameError = validateRequiredText(name, "Survey name");
    const postcodeError = validatePostcode(postcode);
    const timingChanged = !editing
        || date?.getTime() !== originalTiming.date
        || startTime?.getTime() !== originalTiming.start;
    const startError = timingChanged ? validateSurveyStart(date, startTime) : null;
    const endError = validateSurveyEnd(startTime, endTime);
    const hasErrors = !!(nameError || postcodeError || startError || endError);

    const scrollRef = useRef<ScrollView>(null);
    const fieldY = useRef<Record<string, number>>({});
    const createdSurveyId = useRef<string | undefined>(editing ? editParams.surveyId : undefined);

    const seeded = useRef(false);
    useEffect(() => {
        const survey = context?.survey;
        if (!editing || seeded.current || !survey) return;
        seeded.current = true;
        setName(survey.name ?? '');
        setPostcode(survey.postcode ?? '');
        setDate(survey.date ?? undefined);
        setStartTime(survey.startTime ?? undefined);
        setEndTime(survey.endTime ?? undefined);
        setSunsetTime(survey.sunsetTime ?? undefined);
        setOriginalTiming({ date: survey.date?.getTime(), start: survey.startTime?.getTime() });
    }, [editing, context]);

    const returnToStatus = () => {
        if (editing) navigation.popTo('SurveyStatusScreen', { surveyId: editParams.surveyId });
    };

    const scrollToField = (key: string) => {
        const y = fieldY.current[key];
        if (y == null) return;
        setTimeout(() => {
            scrollRef.current?.scrollTo({ y: Math.max(y - 16, 0), animated: true });
        }, 100);
    };

    const saveSurvey = async () => {
        if (isSubmitting || hasErrors) return;
        setIsSubmitting(true);
        try {
            const surveyId = createdSurveyId.current ?? (await service.createSurvey()).id;
            createdSurveyId.current = surveyId;
            const updated = await service.updateSurvey(surveyId, {
                name: name.trim(),
                postcode: postcode.trim() || null,
                date: date ?? null,
                startTime: startTime ?? null,
                endTime: endTime ?? null,
                sunsetTime: sunsetTime ?? null,
            });
            console.log('Survey details updated:', updated);
            void recordRecentSurvey(updated, "admin");
            if (editing) returnToStatus();
            else navigation.navigate('SaveAdminCodeScreen', { surveyId });
        } catch (e) { console.error('createSurvey failed:', e) } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={styles.screen}>
            <View style={{ width: "100%" }}>
                <ScreenHeader navigation={navigation} />
            </View>
            <ScrollView ref={scrollRef} style={{ width: "100%" }} contentContainerStyle={screen.content} keyboardShouldPersistTaps="handled">
                <Title title={editing ? "Edit Survey Details" : "Create Survey"} />
                <InputField testID="survey-name-input" fieldLabel="Survey Name" placeholderText="Input survey name" value={name} onChangeText={setName} onEndEditing={() => setNameTouched(true)} error={nameTouched ? nameError : null} />
                <InputField testID="survey-postcode-input" fieldLabel="Survey Postcode" placeholderText="Input survey postcode" value={postcode} onChangeText={setPostcode} autoCapitalize="characters" onEndEditing={() => setPostcodeTouched(true)} error={postcodeTouched ? postcodeError : null} />
                <View style={{ width: "100%" }} onLayout={(e) => { fieldY.current.date = e.nativeEvent.layout.y; }}>
                    <DatePickerInput fieldLabel="Survey Date" value={date} onChange={setDate} onOpen={() => scrollToField("date")} minimumDate={editing ? undefined : new Date()} error={startTime ? null : startError} />
                </View>
                <View style={{ width: "100%" }} onLayout={(e) => { fieldY.current.start = e.nativeEvent.layout.y; }}>
                    <TimePickerInput fieldLabel="Start Time" value={startTime} onChange={setStartTime} onOpen={() => scrollToField("start")} error={startTime ? startError : null} />
                </View>
                <View style={{ width: "100%" }} onLayout={(e) => { fieldY.current.sunset = e.nativeEvent.layout.y; }}>
                    <TimePickerInput fieldLabel="Sunrise/Sunset Time" value={sunsetTime} onChange={setSunsetTime} onOpen={() => scrollToField("sunset")} />
                </View>
                <View style={{ width: "100%" }} onLayout={(e) => { fieldY.current.end = e.nativeEvent.layout.y; }}>
                    <TimePickerInput fieldLabel="End Time" value={endTime} onChange={setEndTime} onOpen={() => scrollToField("end")} error={endError} />
                </View>

            </ScrollView>
            {editing
                ? <ButtonGroup
                    variant="mixed"
                    labels={["Save", "Cancel"]}
                    disabled={[isSubmitting || hasErrors, false]}
                    onPress={[saveSurvey, returnToStatus]}
                />
                : <Button
                    variant="light"
                    label="Continue"
                    disabled={isSubmitting || hasErrors}
                    onPress={saveSurvey}
                />
            }
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        ...screen.justifyScreen,
    }
});