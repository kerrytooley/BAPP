import { Card } from "@components/Common/Card"
import { StyleSheet, Text, View } from "react-native"
import { Weather } from "@bapp/domain"
import { textStyles } from "@theme/fonts"
import { colours } from "@theme/colours"

interface WeatherProps {
    type: "start" | "end",
    weather: Weather
}

export const WeatherSummary = ({ type, weather }: WeatherProps) => {
    return (
        <Card cardLabel={type === "start" ? "Start Weather Conditons" : "End Weather Condtions"}>
            <View style={styles.row} >
                <Text style={styles.text}>Temperature</Text>
                <Text style={styles.text}>{weather.temperature}°C</Text>
            </View>
            <View style={styles.row} >
                <Text style={styles.text}>Cloud Cover</Text>
                <Text style={styles.text}>{weather.cloudCover}%</Text>
            </View>
            <View style={styles.row} >
                <Text style={styles.text}>Humidity</Text>
                <Text style={styles.text}>{weather.humidity}%</Text>
            </View>
            <View style={styles.row} >
                <Text style={styles.text}>Wind</Text>
                <Text style={styles.text}>{weather.wind} Beaufort</Text>
            </View>
            <View style={styles.row} >
                <Text style={styles.text}>Rain</Text>
                <Text style={styles.text}>{weather.rain + (type === "start" ? "" : " minutes")}</Text>
            </View>
        </Card>
    )
}

const styles = StyleSheet.create({
    text: {
        ...textStyles.inputText,
        color: colours.light
    },
    row: {
        width: "100%",
        justifyContent: "space-between",
        flexDirection: "row"
    }
})