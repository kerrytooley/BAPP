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
                if (contents.includes(anchor)) {
                    contents = contents.replace(anchor, anchor + NON_MODULAR_HEADER_RUBY);
                    fs.writeFileSync(podfilePath, contents);
                } else {
                    console.warn('[withNonModularHeaderFix] Could not find Podfile post_install hook; fix not applied.');
                }
            }

            return cfg;
        },
    ]);
};
