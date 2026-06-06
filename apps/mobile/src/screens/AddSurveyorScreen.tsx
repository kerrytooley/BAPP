import { BackButton, Button } from "@components/Button";
import { Card } from "@components/Card";
import { InputField } from "@components/InputField";
import { Title } from "@components/Titles";
import { screen } from "@theme/screen";
import { View } from "react-native";
import React from "react";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { useNavigation } from "@react-navigation/native";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function AddSurveyorScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    var surveyorCount = 1;

    return (
        <View style={screen.justifyScreen}>
            <BackButton navigation={navigation} />
            <Title title="Add Surveyors" subtitle="Add the details of the surveyors you will have on site" />
            <Card cardLabel="Add Surveyor">
                <InputField placeholderText="Input Surveyor Name" />
                <Button label="Add Surveyor Location" onPress={() => { }} />
            </Card>
            <Button label="Add More Surveyors" onPress={() => { surveyorCount++ }} />
        </View>
    );
}