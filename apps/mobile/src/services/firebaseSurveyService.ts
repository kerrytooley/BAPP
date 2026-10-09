import { FieldValidator, SurveyService } from '@bapp/domain';

/**
 * Firebase (react-native-firebase) backend wiring. Kept in its own module so the
 * default in-memory path never pulls the native SDK into the bundle graph. The
 * repositories load only when {@link createFirebaseSurveyService} is called.
 */

/** Opt-in via `EXPO_PUBLIC_USE_FIREBASE=true` (build/dev env). */
export function isFirebaseEnabled(): boolean {
    return process.env.EXPO_PUBLIC_USE_FIREBASE === 'true';
}

/** Connect to the local Emulator Suite when `EXPO_PUBLIC_FIREBASE_EMULATOR=true`. */
function emulatorOptions(defaultHost: string): { host: string } | undefined {
    if (process.env.EXPO_PUBLIC_FIREBASE_EMULATOR !== 'true') return undefined;
    // Android emulators reach the host machine via 10.0.2.2, not localhost.
    return { host: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ?? defaultHost };
}

/** Build the Firebase backend, initialising the native SDK (+ emulators if requested). */
export async function createFirebaseSurveyService(): Promise<SurveyService> {
    const {
        initFirebase,
        DEFAULT_EMULATOR_CONFIG,
        FirebaseSurveyRepository,
        FirebaseLocationRepository,
        FirebaseSurveyorRepository,
        FirebaseObservationRepository,
        FirebaseMediaRepository,
    } = await import('@bapp/repository/firebase');

    const host = emulatorOptions(DEFAULT_EMULATOR_CONFIG.host);
    await initFirebase({
        emulator: host ? { ...DEFAULT_EMULATOR_CONFIG, host: host.host } : undefined,
    });

    const surveyRepo = new FirebaseSurveyRepository();
    const locationRepo = new FirebaseLocationRepository();
    const surveyorRepo = new FirebaseSurveyorRepository();
    const observationRepo = new FirebaseObservationRepository();
    // TODO(rasterizer / Copilot E): constructed with NO rasterizer, and no Cloud
    // Function runs the server-deferred fallback, so every PDF/HEIC source stays
    // `status: 'processing'` with `renderRef: null` forever — it never becomes
    // displayable. Inject a concrete on-device `Rasterizer` here (a native PDF
    // renderer + HEIC transcoder — see the `Rasterizer` seam in
    // media/boundary-media.ts and firebase/README.md) OR deploy the documented
    // server writeback before enabling this backend with PDF/HEIC media. The
    // rasterizer is also what unblocks Copilot C (image-blank-on-replace).
    // Directly-renderable images (PNG/JPEG/WebP/GIF) already work without it.
    const mediaRepo = new FirebaseMediaRepository();

    // Re-enqueue any media whose upload didn't reach Storage before the app last
    // exited (killed mid-upload, or offline). Fire-and-forget so startup isn't
    // blocked; still-offline devices simply re-queue again next launch.
    void mediaRepo.resumePendingUploads().catch((error) => {
        console.error('[firebase] failed to resume pending media uploads:', error);
    });

    return new SurveyService(
        surveyRepo,
        locationRepo,
        surveyorRepo,
        observationRepo,
        mediaRepo,
        new FieldValidator()
    );
}
