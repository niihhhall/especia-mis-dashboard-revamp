import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // shadcn CLI output is never hand edited, so the two React Compiler rules
  // its upstream code trips (sidebar skeleton width, the use-mobile effect)
  // are switched off for those files only.
  {
    files: ["src/components/ui/**", "src/hooks/use-mobile.ts"],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Untracked review snapshots of the revamp, not part of the app.
    ".agents/**",
  ]),
]);

export default eslintConfig;
