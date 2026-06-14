import { BackButton, Button, ButtonGroup, InlineButton } from "@components/Button";
import { Card } from "@components/Card";
import { InputField } from "@components/InputField";
import { Title } from "@components/Titles";
import { screen } from "@theme/screen";
import { StyleSheet, View } from "react-native";
import React from "react";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";
import { useNavigation } from "@react-navigation/native";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function AddSurveyorScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();
    let surveyorCount = 1;

    //TODO : add functionality to add more surveyors
    //TODO : implement bottom sheet to add surveyor location

    return (
        <View style={screen.justifyScreen}>
            <BackButton navigation={navigation} />
            <Title title="Add Surveyors" subtitle="Add the name and site location of each surveyor for this survey" />
            <View style={styles.content} >
                <Card cardLabel="Add Surveyor" >
                    <InputField placeholderText="Input Surveyor Name" />
                    <Button label="Add Surveyor Location" action='location' onPress={() => { }} />
                </Card>
                <InlineButton label="Add More Surveyors" onPress={() => { }} />
            </View>
            <ButtonGroup
                variant="mixed"
                labels={['Continue', 'Skip']}
                onPress={[() => { }, () => { }]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
        ...screen.content,
        gap: 16,
        justifyContent: 'flex-start',
        flex: 1,
        paddingTop: 24
    }
})