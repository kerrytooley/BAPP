import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { screen } from "@theme/screen";
import { textStyles } from "@theme/fonts";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp, useNavigation } from "@react-navigation/native";
import { BackButton, Button } from "@components/Button";
import { RootStackParamList } from "@navigators/index";
import { AdminStackParamList } from "@navigators/AdminNavigator";

type Nav = CompositeNavigationProp<
    NativeStackNavigationProp<AdminStackParamList>,
    NativeStackNavigationProp<RootStackParamList>
>;

export function SurveySavedScreen(): React.JSX.Element {

    const navigation = useNavigation<Nav>();

    return (
        <View style={screen.justifyScreen}>
            <View style={styles.header}>
                <BackButton navigation={navigation} />
            </View>
            <View style={styles.content} >
                <Text style={textStyles.title}>Survey Saved!</Text>
            </View>
            <Button label="Return Home" variant="light" onPress={() => navigation.navigate("Welcome")} />
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