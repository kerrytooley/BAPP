import { Card } from "@components/Common/Card"
import { StyleSheet, Text, View } from "react-native"
import { Weather } from "@bapp/domain"
import { textStyles } from "@theme/fonts"
import { colours } from "@theme/colours"

interface WeatherProps {
    type: "start" | "end",
    weather: Weather | null,
    onEdit?: () => void,
}

export const WeatherSummary = ({ type, weather, onEdit }: WeatherProps) => {
    const rows: [string, string][] = weather ? [
        ["Temperature", `${weather.temperature}°C`],
        ["Cloud Cover", `${weather.cloudCover}%`],
        ["Humidity", `${weather.humidity}%`],
        ["Wind", `${weather.wind} Beaufort`],
        ["Rain", weather.rain + (type === "start" ? "" : " minutes")],
    ] : [];
    return (
        <Card cardLabel={type === "start" ? "Start Weather Conditions" : "End Weather Conditions"} onEdit={onEdit}>
            {!weather && <Text style={styles.text}>Not recorded</Text>}
            {rows.map(([label, value]) => (
                <View key={label} style={styles.row} >
                    <Text style={styles.text}>{label}</Text>
                    <Text style={styles.text}>{value}</Text>
                </View>
            ))}
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