import { Pressable } from 'react-native';

// RN 0.81 exports Pressable wrapped in React.memo, so the rendered fiber's type
// is the inner component rather than the exported object. Unwrap it so the
// UNSAFE_*ByType(Pressable) queries continue to match a single node.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PressableType = (Pressable as any).type ?? Pressable;
