import { FlightPath, FlightPathPoint, FlightPathSurface } from "@bapp/domain";
import { useEffect, useRef, useState } from "react";
import { Image, LayoutChangeEvent, StyleSheet, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

export type FlightPathProps = {
    imageUri: string;
    surface: FlightPathSurface;
    paths: FlightPath[] | null;
    onCommitPath: (paths: FlightPath[]) => void;
    editable: boolean;
};

export const FlightPathCanvas = ({ imageUri, surface, paths, onCommitPath, editable }: FlightPathProps) => {

    const [layout, setLayout] = useState({ width: 0, height: 0 });
    const [aspectRatio, setAspectRatio] = useState<number>(1);
    const [ratioReady, setRatioReady] = useState(false);
    const [current, setCurrent] = useState<FlightPathPoint[]>([]);
    const currentRef = useRef<FlightPathPoint[]>([]);
    const pathId = useRef(0);

    const isLandscape = aspectRatio > 1;

    const onLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setLayout({ width, height });
    };

    useEffect(() => {
        let active = true;
        setRatioReady(false);
        Image.getSize(
            imageUri,
            (width, height) => {
                if (active && width > 0 && height > 0) {
                    setAspectRatio(width / height);
                    setRatioReady(true);
                }
            },
            () => { if (active) { setAspectRatio(16 / 9); setRatioReady(true); } },
        );
        return () => { active = false; };
    }, [imageUri]);

    // Size of the on-screen rectangle occupied by the (possibly rotated) image,
    // fitted inside the available layout while preserving the image's aspect.
    const canvasSize = (() => {
        if (!ratioReady || !layout.width || !layout.height) {
            return { width: 0, height: 0 };
        }

        // Aspect (width / height) of the content as displayed. When landscape we
        // rotate the image 90deg so it is displayed "tall", maximising height.
        const displayedAspect = isLandscape ? 1 / aspectRatio : aspectRatio;

        const widthFromHeight = layout.height * displayedAspect;

        if (widthFromHeight <= layout.width) {
            return { width: widthFromHeight, height: layout.height };
        }

        return { width: layout.width, height: layout.width / displayedAspect };
    })();

    const clamp = (value: number) => Math.max(0, Math.min(value, 1));

    const makeId = () => {
        pathId.current += 1;
        return `fp-${Date.now()}-${pathId.current}`;
    };

    // Convert a touch in the on-screen (possibly rotated) canvas into a point
    // normalized against the upright, natural-orientation image.
    const displayToImagePoint = (x: number, y: number): FlightPathPoint => {
        const nx = clamp(x / canvasSize.width);
        const ny = clamp(y / canvasSize.height);

        if (!isLandscape) {
            return { x: nx, y: ny };
        }

        // Inverse of a 90deg clockwise rotation: (u, v) -> (nx = 1 - v, ny = u).
        return { x: ny, y: 1 - nx };
    };

    // Convert a normalized upright-image point back into on-screen pixels.
    const imageToDisplayPixels = (point: FlightPathPoint) => {
        const displayPoint = isLandscape
            ? { x: 1 - point.y, y: point.x }
            : { x: point.x, y: point.y };

        return {
            x: displayPoint.x * canvasSize.width,
            y: displayPoint.y * canvasSize.height,
        };
    };

    const toPolylinePoints = (points: FlightPathPoint[]) =>
        points
            .map((point) => {
                const { x, y } = imageToDisplayPixels(point);
                return `${x},${y}`;
            })
            .join(" ");

    const startPath = (x: number, y: number) => {
        if (canvasSize.width === 0 || canvasSize.height === 0) return;
        const next = [displayToImagePoint(x, y)];
        currentRef.current = next;
        setCurrent(next);
    };

    const extendPath = (x: number, y: number) => {
        if (canvasSize.width === 0 || canvasSize.height === 0) return;
        const next = [...currentRef.current, displayToImagePoint(x, y)];
        currentRef.current = next;
        setCurrent(next);
    };

    const endPath = () => {
        const points = currentRef.current;
        currentRef.current = [];
        setCurrent([]);
        if (points.length > 1) {
            onCommitPath([{ id: makeId(), surface, points, createdAt: Date.now(), data: {} }]);
        }
    };

    const pan = Gesture.Pan()
        .enabled(editable)
        .minDistance(0)
        .onBegin((event) => { runOnJS(startPath)(event.x, event.y); })
        .onUpdate((event) => { runOnJS(extendPath)(event.x, event.y); })
        .onEnd(() => { runOnJS(endPath)(); })
        .onFinalize(() => { runOnJS(endPath)(); });

    return (
        <View style={styles.container} onLayout={onLayout}>
            <View
                style={[
                    styles.canvas,
                    { width: canvasSize.width, height: canvasSize.height },
                ]}
            >
                <Image
                    source={{ uri: imageUri }}
                    resizeMode="contain"
                    style={
                        isLandscape
                            ? {
                                position: "absolute",
                                // Laid out before rotation, so dimensions are swapped
                                // to fill the rotated canvas.
                                width: canvasSize.height,
                                height: canvasSize.width,
                                left: (canvasSize.width - canvasSize.height) / 2,
                                top: (canvasSize.height - canvasSize.width) / 2,
                                transform: [{ rotate: "90deg" }],
                            }
                            : StyleSheet.absoluteFill
                    }
                />

                {canvasSize.width > 0 && (
                    <Svg style={StyleSheet.absoluteFill}>
                        {paths?.map((path) =>
                            path.points.length > 1 ? (
                                <Polyline
                                    key={path.id}
                                    points={toPolylinePoints(path.points)}
                                    fill="none"
                                    stroke="red"
                                    strokeWidth={3}
                                />
                            ) : null,
                        )}

                        {current.length > 1 && (
                            <Polyline
                                points={toPolylinePoints(current)}
                                fill="none"
                                stroke="red"
                                strokeWidth={3}
                            />
                        )}
                    </Svg>
                )}

                <GestureDetector gesture={pan}>
                    <View style={StyleSheet.absoluteFill} />
                </GestureDetector>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    canvas: {
        position: "relative",
    },
});
