import { Image, StyleSheet, Text, View } from "react-native"
import { Title } from "./Titles"
import MapPin from "@assets/images/mapPin.svg"
import { forwardRef, useEffect, useState } from "react"
import { BottomSheetBackdrop, BottomSheetBackdropProps, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet"
import { colours } from "@theme/colours"
import { BoundaryPinLayer } from "./BoundaryPinLayer"
import { BoundaryPosition } from "@bapp/domain"
import { Button } from "./Button"
import { textStyles } from "@theme/fonts"

export interface AddLocationProps {
    boundaryImageRef: string | null | undefined
    isEditing?: boolean
    initialPosition?: BoundaryPosition | null
    onChange: (position: BoundaryPosition) => void
}

export const AddLocationBottomSheet = forwardRef<BottomSheetModal, AddLocationProps>(
    ({ boundaryImageRef, isEditing = false, initialPosition = null, onChange }, ref) => {

        const [aspectRatio, setAspectRatio] = useState(1);
        const [position, setPosition] = useState<BoundaryPosition | null>(null);

        useEffect(() => {
            if (!boundaryImageRef) return
            Image.getSize(boundaryImageRef, (imageWidth, imageHeight) => setAspectRatio(imageWidth / imageHeight))
        }, [boundaryImageRef])

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
                snapPoints={["75%"]}
                enablePanDownToClose
                enableDynamicSizing={false}
                backdropComponent={renderBackdrop}
                handleIndicatorStyle={styles.handle}
                backgroundStyle={styles.sheetBackground}
            >
                <BottomSheetView style={styles.content}>
                    <Title title={isEditing ? "Edit Surveyor Location" : "Add Surveyor Location"} subtitle="Tap on the image to drop a pin" />
                    <View style={styles.imageBlock}>
                        <View style={styles.imageContainer}>
                            {boundaryImageRef &&
                                <BoundaryPinLayer
                                    imageUri={boundaryImageRef}
                                    aspectRatio={aspectRatio}
                                    value={position}
                                    onChange={setPosition}
                                />
                            }
                        </View>
                        {position && <Text style={textStyles.subtitle}>Tap again to move pin</Text>}
                    </View>
                    <View style={styles.saveButton}>
                        <Button
                            label="Save Location"
                            variant="light"
                            onPress={() => { if (position) onChange(position) }}
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
    imageContainer: {
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
    },
    imageBlock: {
        width: "100%",
        gap: 8,
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