import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { screen } from "@theme/screen";
import { textStyles } from "@theme/fonts";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootNavigator, RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { BeginOrContinueSurveyScreen } from "./BeginOrContinueSurveyScreen";
import { BackButton } from "@components/Button";
import { RootStackParamList } from "@navigators/index";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SurveySavedScreen(): React.JSX.Element {

    const navigation = useNavigation<Nav>();

    return (
        <View style={screen.justifyScreen}>
            <View style={styles.header}>
                <BackButton navigation={navigation} />
                <TouchableOpacity onPress={() => navigation.navigate("Welcome")} >
                    <Text style={textStyles.subtitle}>Close</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.content} >
                <Text style={textStyles.title}>Survey Saved!</Text>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center"
    },
    content: {
        ...screen.content,
        justifyContent: "center",
        flex: 1
    },
})