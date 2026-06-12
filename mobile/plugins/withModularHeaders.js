const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Clerk's iOS SDK pulls in the Swift pod `AppCheckCore`, which depends on
 * `GoogleUtilities` and `RecaptchaInterop` — pods that do not define modules.
 * Under static linking that fails pod install with:
 *   "The following Swift pods cannot yet be integrated as static libraries"
 * Opt those specific pods into module-map generation via :modular_headers.
 */
const MODULAR_PODS = ["GoogleUtilities", "RecaptchaInterop", "AppCheckCore"];

const withModularHeaders = (config) =>
  withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfile, "utf8");

      const block = MODULAR_PODS.map(
        (name) => `  pod '${name}', :modular_headers => true`
      ).join("\n");

      if (!contents.includes(":modular_headers => true")) {
        // Inject right after `use_expo_modules!` inside the app target.
        contents = contents.replace(
          /(use_expo_modules!\n)/,
          `$1${block}\n`
        );
        fs.writeFileSync(podfile, contents);
      }

      return cfg;
    },
  ]);

module.exports = withModularHeaders;
