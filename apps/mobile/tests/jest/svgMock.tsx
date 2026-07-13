import * as React from 'react';
import { View } from 'react-native';

// Mock for react-native-svg-transformer imports (`import Icon from '*.svg'`).
// Renders a plain View so components that embed SVG icons remain testable.
const SvgMock = (props: Record<string, unknown>) => <View {...props} />;

export default SvgMock;
