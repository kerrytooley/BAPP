import { Button } from "@components/Button";
import { InputField } from "@components/InputField";
import { Title } from "@components/Titles";
import { screen } from "@theme/screen";
import React from "react";
import { StyleSheet, View } from "react-native";


export function CreateSurvey(): React.JSX.Element {
    return (
        <View style={styles.screen}>
            <View style={styles.content}>
                <Title title="Create Survey" />
                <InputField fieldLabel="Survey Name" placeholderText="Input survey name" />
                <InputField fieldLabel="Survey Postcode" placeholderText="Input survey postcode" />
            </View>
            <Button variant="light" label="Continue" onPress={() => { }} />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        ...screen.baseScreen,
        paddingTop: 80,
        paddingHorizontal: 24,
        paddingBottom: 48,
        justifyContent: 'space-between'
    },
    content: {
        width: '100%',
        alignItems: 'center',

    }
})