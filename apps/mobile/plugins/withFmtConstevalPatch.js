const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Ruby injected into the generated Podfile's post_install hook.
// Fix: fmt consteval build failure with Xcode 26 / Clang on macOS Tahoe.
// A -DFMT_USE_CONSTEVAL=0 define does NOT work because fmt/base.h
// unconditionally redefines FMT_USE_CONSTEVAL based on compiler detection.
// Instead, patch the header so FMT_CONSTEVAL expands to nothing.
const FMT_PATCH_RUBY = `
    # [withFmtConstevalPatch] Disable fmt consteval for Xcode 26 / Clang.
    fmt_base = File.join(installer.sandbox.root, 'fmt', 'include', 'fmt', 'base.h')
    if File.exist?(fmt_base)
      text = File.read(fmt_base)
      patched = text.sub(
        "#if FMT_USE_CONSTEVAL\\n#  define FMT_CONSTEVAL consteval",
        "#if 0  // patched: disable consteval for Xcode 26 / Clang\\n#  define FMT_CONSTEVAL consteval"
      )
      if text != patched
        File.write(fmt_base, patched)
        puts "[fmt patch] Disabled FMT_CONSTEVAL in #{fmt_base}"
      end
    end
`;

/**
 * Injects the fmt consteval header patch into the iOS Podfile's post_install
 * block so it survives `expo prebuild --clean`.
 */
module.exports = function withFmtConstevalPatch(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const podfilePath = path.join(
        cfg.modRequest.platformProjectRoot,
        'Podfile',
      );
      let contents = fs.readFileSync(podfilePath, 'utf8');

      if (!contents.includes('[withFmtConstevalPatch]')) {
        const anchor = 'post_install do |installer|\n';
        if (contents.includes(anchor)) {
          contents = contents.replace(anchor, anchor + FMT_PATCH_RUBY);
          fs.writeFileSync(podfilePath, contents);
        }
      } else {
        console.warn('[withFmtConstevalPatch] Could not find Podfile post_install hook; fmt patch not applied.');
      }

      return cfg;
    },
  ]);
};
