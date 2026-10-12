import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from "react-native"
import { Title } from "../Common/Titles"
import { forwardRef, useMemo, useState } from "react"
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet"
import { colours } from "@theme/colours"
import { textStyles } from "@theme/fonts"
import { FlightPath, FlightPathSurface } from "@bapp/domain"
import { Button } from "../Common/Button";
import { FlightPathCanvas } from "../Interactive/FlightPathCanvas"
import { useSafeAreaInsets } from "react-native-safe-area-context"
// Gesture-handler's ScrollView so horizontal swipes cooperate with the sheet's pan gesture.
import { ScrollView } from "react-native-gesture-handler"

/** An earlier flight path the surveyor can reuse instead of drawing. */
export interface FlightPathOption {
    letter: string
    key: string
    /** The copy to store if this path is chosen. */
    paths: FlightPath[]
}

export interface AddFlightPathProps {
    imageUri: string
    surface: FlightPathSurface
    isEditing?: boolean
    initialPaths?: FlightPath[]
    /** Key of the saved path this observation already holds, preselected among the options. */
    initialKey?: string | null
    options?: FlightPathOption[]
    /** Either a chosen option's copy, or freshly drawn strokes (no `pathKey` yet). */
    onCommit: (paths: FlightPath[]) => void
}

export const AddFlightPathBottomSheet = forwardRef<BottomSheetModal, AddFlightPathProps>(
    ({ imageUri, surface, isEditing = false, initialPaths = [], initialKey = null, options = [], onCommit }, ref) => {

        const [paths, setPaths] = useState<FlightPath[]>([]);
        const [selectedKey, setSelectedKey] = useState<string | null>(null);
        const insets = useSafeAreaInsets();
        const { height: windowHeight } = useWindowDimensions();
        const snapPoints = useMemo(() => ["100%"], []);

        // BottomSheetView wraps its content height rather than filling the sheet,
        // so give it an explicit height to establish a bounded flex context.
        const sheetHeight = windowHeight - insets.top;

        const renderBackdrop = (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                appearsOnIndex={0}
                disappearsOnIndex={-1}
            />
        )

        const selected = options.find((option) => option.key === selectedKey);
        const canSave = selected ? true : paths.length > 0;

        const save = () => onCommit(selected ? selected.paths : paths);

        const renderChip = (label: string, isSelected: boolean, onPress: () => void) => (
            <TouchableOpacity
                key={label}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={onPress}
                accessibilityRole="radio"
                accessibilityLabel={label === "Draw new" ? label : `Flight path ${label}`}
                accessibilityState={{ selected: isSelected }}
            >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{label}</Text>
            </TouchableOpacity>
        )

        return (
            <BottomSheetModal
                ref={ref}
                onChange={(index) => {
                    if (index >= 0) {
                        setPaths(initialPaths)
                        setSelectedKey(initialKey)
                    }
                }}
                onDismiss={() => {
                    setPaths([])
                    setSelectedKey(null)
                }}
                snapPoints={snapPoints}
                topInset={insets.top}
                enablePanDownToClose
                enableDynamicSizing={false}
                backdropComponent={renderBackdrop}
                handleIndicatorStyle={styles.handle}
                backgroundStyle={styles.sheetBackground}
            >
                <BottomSheetView style={[styles.content, { height: sheetHeight, paddingBottom: 16 + insets.bottom }]}>
                    <Title
                        title={isEditing ? "Edit Flight Path" : "Add Flight Path"}
                        subtitle={"Draw on the image to record a new flight path, or re-use an existing path"}
                    />
                    {imageUri &&
                        <View style={styles.canvasContainer}>
                            <FlightPathCanvas
                                imageUri={imageUri}
                                surface={surface}
                                paths={selected ? selected.paths : paths}
                                onCommitPath={(committed) =>
                                    setPaths((prev) => [...prev, ...committed])
                                }
                                editable={!selected}
                            />
                        </View>
                    }
                    {options.length > 0 &&
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.chipScroll}
                            contentContainerStyle={styles.chipRow}
                            accessibilityRole="radiogroup"
                        >
                            {renderChip("Draw new", !selected, () => setSelectedKey(null))}
                            {options.map((option) =>
                                renderChip(option.letter, option === selected, () => setSelectedKey(option.key))
                            )}
                        </ScrollView>
                    }
                    <View style={styles.saveButton}>
                        <Button
                            label="Save Flight Path"
                            variant="light"
                            onPress={save}
                            disabled={!canSave}
                        />
                    </View>
                </BottomSheetView>
            </BottomSheetModal>
        )
    }
)

const styles = StyleSheet.create({
    sheetBackground: {
        backgroundColor: colours.cardbackground,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16
    },
    handle: {
        backgroundColor: colours.light,
        width: 40
    },
    content: {
        padding: 16,
        gap: 24
    },
    saveButton: {
        width: "100%",
        marginTop: "auto"
    },
    canvasContainer: {
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
    },
    chipScroll: {
        flexGrow: 0,
    },
    chipRow: {
        flexDirection: "row",
        gap: 8,
    },
    chip: {
        minWidth: 44,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colours.buttonBorder,
        backgroundColor: colours.inputBackground,
        alignItems: "center",
    },
    chipSelected: {
        backgroundColor: colours.light,
        borderColor: colours.light,
    },
    chipText: {
        ...textStyles.inputText,
        color: colours.light,
    },
    chipTextSelected: {
        color: colours.dark,
    },

})
