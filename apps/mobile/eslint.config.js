const { defineConfig } = require("eslint/config");
const expo = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expo,
  {
    ignores: [
      "dist/*",
      "src/components/animated-icon*",
      "src/components/app-tabs*",
      "src/components/themed-*",
      "src/components/hint-row*",
      "src/components/web-badge*",
      "src/hooks/*",
      "scripts/configure-project.mjs",
    ],
  },
]);
