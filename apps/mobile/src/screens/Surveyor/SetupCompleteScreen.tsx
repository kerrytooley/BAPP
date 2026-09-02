import { SurveyorStackParamList } from "@navigators/SurveyorNavigator";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import { screen } from "@theme/screen";
import { BackButton, Button } from "@components/Button";
import { fonts, textStyles } from "@theme/fonts";


type Nav = NativeStackNavigationProp<SurveyorStackParamList>;

export function SetupCompleteScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    const { surveyId, surveyorId, locationId } = useRoute<RouteProp<SurveyorStackParamList, 'SetupCompleteScreen'>>().params;


    return (
        <View style={screen.justifyScreen} >
            <View style={{ width: "100%" }} >
                <BackButton navigation={navigation} />
            </View>
            <View style={screen.content} >
                <Text style={styles.title}>Survey Setup Complete!</Text>
            </View>
            <Button label="Next" onPress={() => navigation.navigate("SurveyScreen", { surveyId, locationId, surveyorId })} />
        </View>
    )
}

const styles = StyleSheet.create({
    title: {
        ...textStyles.title,
        fontSize: fonts.size.xl
    }
})