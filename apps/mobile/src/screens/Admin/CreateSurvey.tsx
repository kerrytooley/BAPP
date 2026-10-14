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
import { validatePostcode, validateRequiredText, validateSurveyTiming } from "@bapp/domain";
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
    // Errors stay hidden until the first Continue/Save, then update live.
    const [submitted, setSubmitted] = useState(false);
    const [originalTiming, setOriginalTiming] = useState<{ date?: number; start?: number }>({});
    const timingChanged = !editing
        || date?.getTime() !== originalTiming.date
        || startTime?.getTime() !== originalTiming.start;
    // A function so pressing Continue re-checks "not in the past" against the current time.
    const validate = () => ({
        name: validateRequiredText(name, "Survey name"),
        postcode: validatePostcode(postcode),
        ...validateSurveyTiming({ date, startTime, sunsetTime, endTime }, { checkStart: timingChanged }),
    });
    type Errors = ReturnType<typeof validate>;
    const errors = validate();
    const shown = (key: keyof Errors) => (submitted ? errors[key] : null);

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

    const scrollToFirstError = (current: Errors) => {
        if (current.name || current.postcode) {
            scrollRef.current?.scrollTo({ y: 0, animated: true });
            return;
        }
        scrollToField(current.start ? (startTime ? "start" : "date") : current.sunset ? "sunset" : "end");
    };

    const saveSurvey = async () => {
        if (isSubmitting) return;
        const current = validate();
        if (Object.values(current).some(Boolean)) {
            setSubmitted(true);
            scrollToFirstError(current);
            return;
        }
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
                <InputField testID="survey-name-input" fieldLabel="Survey Name" placeholderText="Input survey name" value={name} onChangeText={setName} error={shown("name")} />
                <InputField testID="survey-postcode-input" fieldLabel="Survey Postcode" placeholderText="Input survey postcode" value={postcode} onChangeText={setPostcode} autoCapitalize="characters" error={shown("postcode")} />
                <View style={{ width: "100%" }} onLayout={(e) => { fieldY.current.date = e.nativeEvent.layout.y; }}>
                    <DatePickerInput fieldLabel="Survey Date" value={date} onChange={setDate} onOpen={() => scrollToField("date")} minimumDate={editing ? undefined : new Date()} error={startTime ? null : shown("start")} />
                </View>
                <View style={{ width: "100%" }} onLayout={(e) => { fieldY.current.start = e.nativeEvent.layout.y; }}>
                    <TimePickerInput fieldLabel="Start Time" value={startTime} onChange={setStartTime} onOpen={() => scrollToField("start")} error={startTime ? shown("start") : null} />
                </View>
                <View style={{ width: "100%" }} onLayout={(e) => { fieldY.current.sunset = e.nativeEvent.layout.y; }}>
                    <TimePickerInput fieldLabel="Sunrise/Sunset Time" value={sunsetTime} onChange={setSunsetTime} onOpen={() => scrollToField("sunset")} error={shown("sunset")} />
                </View>
                <View style={{ width: "100%" }} onLayout={(e) => { fieldY.current.end = e.nativeEvent.layout.y; }}>
                    <TimePickerInput fieldLabel="End Time" value={endTime} onChange={setEndTime} onOpen={() => scrollToField("end")} error={shown("end")} />
                </View>

            </ScrollView>
            {editing
                ? <ButtonGroup
                    variant="mixed"
                    labels={["Save", "Cancel"]}
                    disabled={[isSubmitting, false]}
                    onPress={[saveSurvey, returnToStatus]}
                />
                : <Button
                    variant="light"
                    label="Continue"
                    disabled={isSubmitting}
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