import { BackButton, Button } from "@components/Button";
import { DateInput } from "@components/DateInput";
import { InputField } from "@components/InputField";
import { TimeInput } from "@components/TimeInput";
import { Title } from "@components/Titles";
import { screen } from "@theme/screen";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { AdminStackParamList } from "@navigators/AdminNavigator";

type Nav = NativeStackNavigationProp<AdminStackParamList>;

export function CreateSurvey(): React.JSX.Element {
    const navigation = useNavigation<Nav>();

    return (
        <View style={styles.screen}>
            <BackButton navigation={navigation} />
            <View style={styles.content}>
                <Title title="Create Survey" />
                <InputField fieldLabel="Survey Name" placeholderText="Input survey name" />
                <InputField fieldLabel="Survey Postcode" placeholderText="Input survey postcode" />
                <DateInput fieldLabel="Survey Date" />
                <TimeInput fieldLabel="Start Time" />
                <TimeInput fieldLabel="End Time" />
                <TimeInput fieldLabel="Sunrise/Sunset Time" />
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