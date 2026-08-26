import { StyleSheet, View } from "react-native"
import { Title } from "./Titles"
import { forwardRef, useState } from "react"
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet"
import { colours } from "@theme/colours"
import { BoundaryPosition } from "@bapp/domain"
import { Button } from "./Button"
import { LocationEditor } from "./LocationEditor"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export interface AddLocationProps {
    // A resolved, locally-renderable image URI (not a storage reference).
    boundaryImageUri: string | null | undefined
    isEditing?: boolean
    initialPosition?: BoundaryPosition | null
    onChange: (position: BoundaryPosition) => void
}

export const AddLocationBottomSheet = forwardRef<BottomSheetModal, AddLocationProps>(
    ({ boundaryImageUri, isEditing = false, initialPosition = null, onChange }, ref) => {

        const [position, setPosition] = useState<BoundaryPosition | null>(null);
        const insets = useSafeAreaInsets();


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
                onChange={(index) => { if (index >= 0) setPosition(initialPosition) }}
                onDismiss={() => setPosition(null)}
                snapPoints={["100%"]}
                topInset={insets.top}
                enablePanDownToClose
                enableDynamicSizing={false}
                backdropComponent={renderBackdrop}
                handleIndicatorStyle={styles.handle}
                backgroundStyle={styles.sheetBackground}
            >
                <BottomSheetView style={[styles.content, { paddingBottom: 16 + insets.bottom }]}>
                    <Title title={isEditing ? "Edit Surveyor Location" : "Add Surveyor Location"} subtitle="Tap on the image to drop a pin" />
                    <LocationEditor boundaryImageUri={boundaryImageUri}
                        position={position}
                        setPosition={setPosition} />
                    <View style={styles.saveButton}>
                        <Button
                            label="Save Location"
                            variant="light"
                            onPress={() => onChange(position as BoundaryPosition)}
                            disabled={!position}
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
        flex: 1,
        padding: 16,
        gap: 24
    },
    saveButton: {
        width: "100%",
        marginTop: "auto"
    },
    image: {
        width: "100%",
        height: "100%"
    }

})