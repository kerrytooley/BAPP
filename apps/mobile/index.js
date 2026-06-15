import './polyfills';
import { registerRootComponent } from 'expo';
import App from './App';

// Set EXPO_PUBLIC_STORYBOOK=true in your environment (or .env.local) to launch Storybook.
// Example: EXPO_PUBLIC_STORYBOOK=true pnpm start
const STORYBOOK_ENABLED = process.env.EXPO_PUBLIC_STORYBOOK === 'true';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const EntryPoint = STORYBOOK_ENABLED ? require('./.rnstorybook').default : App;

registerRootComponent(EntryPoint);
