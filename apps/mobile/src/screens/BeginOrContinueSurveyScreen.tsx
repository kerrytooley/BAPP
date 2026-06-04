import { ButtonGroup } from "@components/Button";
import { Title } from "@components/Titles";
import { screen } from "@theme/screen";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

export function BeginOrContinueSurveyScreen(): React.JSX.Element {
    const navigation = useNavigation();

    return (
        <View style={styles.screen}>
            <Title title="Begin or continue a survey" subtitle="Start a new survey or pick up where you left with an existing one" />
            <ButtonGroup labels={['Begin a new survey', 'Continue existing survey']}
                onPress={[
                    () => { },
                    () => { },
                ]} />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        ...screen.baseScreen,
        paddingTop: 160,
        gap: 160
    }
})