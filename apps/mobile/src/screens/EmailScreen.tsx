import React from "react";
import { useNavigation } from "@react-navigation/native";
import { StyleSheet, View } from "react-native"
import { screen } from "@theme/screen";
import { Title } from "@components/Titles";
import { InputField } from "@components/InputField";
import { Button } from "@components/Button";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function EmailScreen(): React.JSX.Element {
    const navigation = useNavigation<Nav>();

    return (
        <View style={styles.screen}>
            <View style={styles.content}>
                <Title title="Enter Email Address" subtitle="Enter the email address to send the completed survey report to." />
                <InputField fieldLabel="Email Address" placeholderText="Input email address" />
            </View>
            <Button variant="light" label="Continue" onPress={() => { navigation.navigate('CreateSurvey') }} />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        ...screen.baseScreen,
        paddingTop: 160,
        paddingHorizontal: 24,
        paddingBottom: 48,
        justifyContent: 'space-between',
    },
    content: {
        gap: 80,
        width: '100%',
        alignItems: 'center',
    }
})