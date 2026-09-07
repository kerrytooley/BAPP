import { BackButton, Button } from "@components/Common/Button";
import { InputField } from "@components/Common/InputField";
import { Title } from "@components/Common/Titles";
import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { screen } from "@theme/screen";
import { colours } from "@theme/colours";
import React, { useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Card } from "@components/Common/Card";
import { useSurveyService } from "@services/surveyServiceContext";
import { UpdateSurveyInput } from "@bapp/domain";
import { textStyles } from "@theme/fonts";

type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function WeatherConditionsScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, surveyorId, locationId, type } = useRoute<RouteProp<SurveyorStackParamList, "WeatherConditionsScreen">>().params;
    const service = useSurveyService();

    const [temperature, setTemperature] = useState<string>();
    const [cloudCover, setCloudCover] = useState<string>();
    const [humidity, setHumidity] = useState<string>();
    const [wind, setWind] = useState<string>();
    const [rain, setRain] = useState<string>();
    const isSubmitting = useRef(false);

    const rainOptions: { label: string }[] = [
        { label: "Wet" },
        { label: "Dry" }
    ];

    const handleContinue = async () => {
        if (isSubmitting.current) return;
        isSubmitting.current = true;
        const weatherConditions = {
            weather: {
                temperature: temperature,
                cloudCover: cloudCover,
                humidity: humidity,
                wind: wind,
                rain: rain
            }
        } as UpdateSurveyInput;
        try {
            const updatedSurvey = await service.updateSurvey(surveyId, weatherConditions);
            console.log('Survey updated with weather conditions: ', updatedSurvey);
            type === "start" && navigation.navigate("SurveyorConfirmLocationScreen", { surveyId, surveyorId })
            type === "end" && navigation.navigate("SurveySummaryScreen", { surveyId, surveyorId, locationId })
        } catch (e) {
            console.error('Failed to save weather conditions', e);
        } finally {
            isSubmitting.current = false;
        }
    }

    return (
        <View style={screen.justifyScreen}>
            <View style={{ width: "100%" }}>
                <BackButton navigation={navigation} />
                <Title title={type === "start" ? "Start Weather Conditions" : "End Weather Conditions"} />
            </View>
            <View style={styles.content} >
                <InputField testID="weather-temperature-input" value={temperature} variant="unit" fieldLabel="Temperature" placeholderText="Input Temperature" unit="°C" onChangeText={setTemperature} />
                <InputField value={cloudCover} variant="unit" fieldLabel="Cloud Cover" placeholderText="Input Cloud Cover" unit="%" onChangeText={setCloudCover} />
                <InputField value={humidity} variant="unit" fieldLabel="Humidity" placeholderText="Input Humidity" unit="%" onChangeText={setHumidity} />
                <InputField value={wind} variant="unit" fieldLabel="Wind" placeholderText="Input Wind" unit="Beaufort" onChangeText={setWind} />
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
                    <InputField value={rain} variant="unit" fieldLabel="Rain" placeholderText="Input Rain" unit="Minutes" onChangeText={setRain} />
                }
            </View>
            <Button label="Continue" variant="light" onPress={() => handleContinue()} />
        </View>
    )
}

const styles = StyleSheet.create({
    content: {
        ...screen.content,
        justifyContent: "flex-start",
        flex: 1,
        paddingTop: 16
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