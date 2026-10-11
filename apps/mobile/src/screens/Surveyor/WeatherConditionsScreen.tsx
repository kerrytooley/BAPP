import { ScreenHeader } from "@components/Common/ScreenHeader";
import { ButtonGroup } from "@components/Common/Button";
import { InputField } from "@components/Common/InputField";
import { Title } from "@components/Common/Titles";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen";
import { colours } from "@theme/colours";
import React, { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Card } from "@components/Common/Card";
import { useSurveyService } from "@services/surveyServiceContext";
import { useActiveSurvey } from "@services/ActiveSurveyProvider";
import { goToLocationStep } from "@services/locationStep";
import { continueResumedSetup } from "@services/setupResume";
import { isBlank, START_RAIN_OPTIONS, validateWeather, Weather } from "@bapp/domain";
import { textStyles } from "@theme/fonts";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function WeatherConditionsScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, surveyorId, locationId, type, mode } = useRoute<RouteProp<SurveyorStackParamList, "WeatherConditionsScreen">>().params;
    const service = useSurveyService();
    const { context } = useActiveSurvey();

    const [temperature, setTemperature] = useState<string>();
    const [cloudCover, setCloudCover] = useState<string>();
    const [humidity, setHumidity] = useState<string>();
    const [wind, setWind] = useState<string>();
    const [rain, setRain] = useState<string>();
    const [touched, setTouched] = useState<Partial<Record<keyof Weather, boolean>>>({});
    const isSubmitting = useRef(false);
    const prefilled = useRef(false);

    // Returning to this step (resume/edit) shows what was saved before. Filled once
    // from the live context; later re-emits and anything already typed are kept.
    useEffect(() => {
        if (!mode || !context || prefilled.current) return;
        prefilled.current = true;
        const saved = type === "start" ? context.survey.startWeather : context.survey.endWeather;
        if (!saved) return;
        setTemperature((current) => current ?? saved.temperature);
        setCloudCover((current) => current ?? saved.cloudCover);
        setHumidity((current) => current ?? saved.humidity);
        setWind((current) => current ?? saved.wind);
        setRain((current) => current ?? saved.rain);
    }, [mode, context, type]);

    const rainOptions = START_RAIN_OPTIONS.map((label) => ({ label }));

    const readings: Weather = {
        temperature: temperature?.trim() ?? "",
        cloudCover: cloudCover?.trim() ?? "",
        humidity: humidity?.trim() ?? "",
        wind: wind?.trim() ?? "",
        rain: rain?.trim() ?? "",
    };
    const errors = validateWeather(readings, type);
    const hasInput = Object.values(readings).some((value) => !isBlank(value));
    const canContinue = hasInput && Object.keys(errors).length === 0;
    const errorFor = (field: keyof Weather) => (touched[field] ? errors[field] : null);
    const touch = (field: keyof Weather) => () => setTouched((prev) => ({ ...prev, [field]: true }));

    const goNext = async () => {
        if (mode === "edit") {
            navigation.goBack();
            return;
        }
        if (type === "end") {
            navigation.navigate("SurveySummaryScreen", { surveyId, surveyorId, locationId });
            return;
        }
        try {
            if (mode === "resume") await continueResumedSetup(service, navigation, surveyId, surveyorId, "startWeather");
            else await goToLocationStep(service, navigation, surveyId, surveyorId);
        } catch (e) {
            console.error('Unable to continue to the location step', e);
        }
    }

    const handleContinue = async () => {
        if (isSubmitting.current || !canContinue) return;
        isSubmitting.current = true;
        const updateInput = type == "start" ? { startWeather: readings } : { endWeather: readings };
        try {
            const updatedSurvey = await service.updateSurvey(surveyId, updateInput);
            console.log('Survey updated with weather conditions: ', updatedSurvey);
        } catch (e) {
            console.error('Failed to save weather conditions', e);
            isSubmitting.current = false;
            return;
        }
        await goNext();
        isSubmitting.current = false;
    }

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <ScreenHeader navigation={navigation} />
                <Title title={type === "start" ? "Start Weather Conditions" : "End Weather Conditions"} />
            </View>
            <ScrollView
                style={screen.scroll}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
            >
                <InputField testID="weather-temperature-input" value={temperature} variant="unit" fieldLabel="Temperature" placeholderText="Input Temperature" unit="°C" keyboardType="numbers-and-punctuation" onChangeText={setTemperature} onEndEditing={touch("temperature")} error={errorFor("temperature")} />
                <InputField value={cloudCover} variant="unit" fieldLabel="Cloud Cover" placeholderText="Input Cloud Cover" unit="%" keyboardType="decimal-pad" onChangeText={setCloudCover} onEndEditing={touch("cloudCover")} error={errorFor("cloudCover")} />
                <InputField value={humidity} variant="unit" fieldLabel="Humidity" placeholderText="Input Humidity" unit="%" keyboardType="decimal-pad" onChangeText={setHumidity} onEndEditing={touch("humidity")} error={errorFor("humidity")} />
                <InputField value={wind} variant="unit" fieldLabel="Wind" placeholderText="Input Wind" unit="Beaufort" keyboardType="number-pad" onChangeText={setWind} onEndEditing={touch("wind")} error={errorFor("wind")} />
                {type === "start" &&
                    <Card cardLabel="Rain" style={styles.rainCardWrapper} contentStyle={styles.rainCard}>
                        <View style={styles.rainRow}>
                            <Text style={styles.rainLabel}>Rain</Text>
                            <View style={styles.radioGroup} accessibilityRole="radiogroup">
                                {rainOptions.map((option) => {
                                    const selected = rain === option.label;
                                    return (
                                        <TouchableOpacity
                                            key={option.label}
                                            style={styles.radioOption}
                                            onPress={() => setRain(option.label)}
                                            testID={option.label}
                                            accessibilityLabel={option.label}
                                            accessibilityRole="radio"
                                            accessibilityState={{ selected }}
                                        >
                                            <Text style={styles.radioLabel}>{option.label}</Text>
                                            <View style={styles.radioOuter}>
                                                {selected && <View style={styles.radioInner} />}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </Card>
                }
                {type === "end" &&
                    <InputField value={rain} variant="unit" fieldLabel="Rain" placeholderText="Input Rain" unit="Minutes" keyboardType="number-pad" onChangeText={setRain} onEndEditing={touch("rain")} error={errorFor("rain")} />
                }
            </ScrollView>
            <ButtonGroup
                variant="mixed"
                labels={mode === "edit" ? ["Save", "Cancel"] : ["Continue", "Skip"]}
                disabled={[!canContinue, false]}
                onPress={[handleContinue, mode === "edit" ? () => navigation.goBack() : goNext]}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    content: {
        ...screen.scrollContent,
        paddingTop: 16,
        paddingBottom: 24,
    },
    rainCardWrapper: {
        paddingTop: 8,
    },
    rainCard: {
        minHeight: 0,
        paddingVertical: 16,
    },
    rainRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between"
    },
    rainLabel: {
        ...textStyles.subtitle,
    },
    radioGroup: {
        flexDirection: "row",
        alignItems: "center"
    },
    radioOption: {
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 24
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colours.inputBorder,
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colours.light
    },
    radioLabel: {
        ...textStyles.subtitle
    }
})