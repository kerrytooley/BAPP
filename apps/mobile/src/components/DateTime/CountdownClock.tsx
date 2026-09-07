import { Text, View, StyleSheet } from "react-native";
import { useCountdown } from "../../hooks/countdown";
import { formatCountdown } from "@utils/dateTimeUtils";
import { colours } from "@theme/colours";
import { textStyles } from "@theme/fonts";

interface CountdownClockProps {
    startTime: Date,
    endTime: Date
}

export const CountdownClock = ({ startTime, endTime }: CountdownClockProps) => {

    const isBeforeStart = startTime.getTime() > Date.now()
    const target = isBeforeStart ? startTime : endTime;
    const countdownTitle = isBeforeStart ? "Time until survey start:" : "Time until survey end:";
    const countdown = useCountdown(target);
    const timeString = formatCountdown(countdown.hours, countdown.minutes, countdown.seconds);

    return (
        <View style={styles.countdownContainer}>
            <Text style={styles.countdownTitle}>{countdownTitle}</Text>
            <Text style={textStyles.countdown}>{timeString}</Text>
        </View>
    );

};

const styles = StyleSheet.create({
    countdownContainer: {
        borderRadius: 16,
        backgroundColor: colours.cardbackground,
        borderColor: colours.inputBorder,
        borderWidth: 1,
        padding: 24,
        width: "100%",
        justifyContent: "center",
        gap: 16
    },
    countdownTitle: {
        ...textStyles.inputTitleText,
        textAlign: "center",
        color: colours.light
    }
});