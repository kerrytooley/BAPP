import { StyleSheet, useWindowDimensions, View } from "react-native"
import { Title } from "../Common/Titles"
import { forwardRef, useMemo, useState } from "react"
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet"
import { colours } from "@theme/colours"
import { FlightPath, FlightPathSurface } from "@bapp/domain"
import { Button } from "../Common/Button";
import { FlightPathCanvas } from "../Interactive/FlightPathCanvas"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export interface AddFlightPathProps {
    imageUri: string
    surface: FlightPathSurface
    isEditing?: boolean
    initialPaths?: FlightPath[]
    onCommitPath: (paths: FlightPath[]) => void
}

export const AddFlightPathBottomSheet = forwardRef<BottomSheetModal, AddFlightPathProps>(
    ({ imageUri, surface, isEditing = false, initialPaths = [], onCommitPath }, ref) => {

        const [paths, setPaths] = useState<FlightPath[]>([]);
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

        return (
            <BottomSheetModal
                ref={ref}
                onChange={(index) => { if (index >= 0) setPaths(initialPaths) }}
                onDismiss={() => setPaths([])}
                snapPoints={snapPoints}
                topInset={insets.top}
                enablePanDownToClose
                enableDynamicSizing={false}
                backdropComponent={renderBackdrop}
                handleIndicatorStyle={styles.handle}
                backgroundStyle={styles.sheetBackground}
            >
                <BottomSheetView style={[styles.content, { height: sheetHeight, paddingBottom: 16 + insets.bottom }]}>
                    <Title title={isEditing ? "Edit Flight Path" : "Add Flight Path"} subtitle="Draw on the image to record a flight path" />
                    {imageUri &&
                        <View style={styles.canvasContainer}>
                            <FlightPathCanvas
                                imageUri={imageUri}
                                surface={surface}
                                paths={paths}
                                onCommitPath={(committed) =>
                                    setPaths((prev) => [...prev, ...committed])
                                }
                                editable
                            />
                        </View>
                    }
                    <View style={styles.saveButton}>
                        <Button
                            label="Save Flight Path"
                            variant="light"
                            onPress={() => onCommitPath(paths as FlightPath[])}
                            disabled={paths.length === 0}
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

})
