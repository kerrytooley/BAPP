import React from "react";
import type { StyleProp, TextStyle } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colours } from "@theme/colours";

// Thin wrappers around Feather (MIT-licensed, bundled with Expo) that preserve
// the prop shape the app previously used with the local SVG icon components
// (width/height/stroke/color/style). This lets us drop the CC BY-licensed
// Figma "Simple Design System" SVGs without touching call sites.

type FeatherName = React.ComponentProps<typeof Feather>["name"];

interface IconProps {
    width?: number;
    height?: number;
    color?: string;
    /** Legacy SVG prop; treated as the icon colour when `color` is absent. */
    stroke?: string;
    /** Accepted for API compatibility; Feather uses a fixed stroke weight. */
    strokeWidth?: number;
    style?: StyleProp<TextStyle>;
}

function makeIcon(name: FeatherName, defaultSize: number, defaultColor: string = colours.light) {
    return function Icon({ width, height, color, stroke, strokeWidth: _strokeWidth, style }: IconProps) {
        const size = width ?? height ?? defaultSize;
        return <Feather name={name} size={size} color={color ?? stroke ?? defaultColor} style={style} />;
    };
}

export const Plus = makeIcon("plus", 17);
export const PlusButton = makeIcon("plus-circle", 32);
export const MinusButton = makeIcon("minus-circle", 44);
export const MapPin = makeIcon("map-pin", 24);
export const Close = makeIcon("x", 14);
export const ChevronRight = makeIcon("chevron-right", 16);
export const ChevronLeft = makeIcon("chevron-left", 28);
export const Expand = makeIcon("maximize", 24);
export const Upload = makeIcon("upload", 44);
export const Rotate = makeIcon("refresh-cw", 48, colours.placeholderText);
export const RightArrow = makeIcon("arrow-right", 17);
export const Info = makeIcon("info", 20);
