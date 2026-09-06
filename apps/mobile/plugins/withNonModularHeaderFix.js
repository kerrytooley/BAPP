const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Ruby injected into the generated Podfile's post_install hook.
// Fix: @react-native-firebase headers `#import <React/RCTBridgeModule.h>` (a
// non-modular header) inside their framework modules. With `use_frameworks!
// :linkage => :static` (required by the Firebase iOS SDK) and RN's `-Werror`,
// this triggers -Wnon-modular-include-in-framework-module and fails the build.
// Silencing that one warning on the Pods targets is the documented workaround.
const NON_MODULAR_HEADER_RUBY = `
    # [withNonModularHeaderFix] Allow RNFB framework modules to import non-modular React headers.
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        config.build_settings['CLANG_WARN_NON_MODULAR_INCLUDE_IN_FRAMEWORK_MODULE'] = 'NO'
      end
    end
`;

/**
 * Injects the non-modular header fix into the iOS Podfile's post_install block
 * so it survives `expo prebuild --clean` and EAS builds.
 */
module.exports = function withNonModularHeaderFix(config) {
    return withDangerousMod(config, [
        'ios',
        async (cfg) => {
            const podfilePath = path.join(
                cfg.modRequest.platformProjectRoot,
                'Podfile',
            );
            let contents = fs.readFileSync(podfilePath, 'utf8');

            if (!contents.includes('[withNonModularHeaderFix]')) {
                const anchor = 'post_install do |installer|\n';
                if (!contents.includes(anchor)) {
                    // Fail the prebuild/config step LOUDLY. If Expo changes the
                    // generated Podfile shape, silently skipping this required fix
                    // lets prebuild "succeed" only to fail later during CocoaPods/
                    // Xcode compilation with an inscrutable non-modular-header error.
                    throw new Error(
                        '[withNonModularHeaderFix] Could not find the Podfile "post_install do |installer|" ' +
                        'hook to inject the required Firebase non-modular-header fix. The generated Podfile ' +
                        'shape has likely changed — update this plugin\'s anchor. Refusing to prebuild without ' +
                        'the fix (the iOS build would otherwise fail later with -Wnon-modular-include-in-framework-module).',
                    );
                }
                contents = contents.replace(anchor, anchor + NON_MODULAR_HEADER_RUBY);
                fs.writeFileSync(podfilePath, contents);
            }

            return cfg;
        },
    ]);
};
