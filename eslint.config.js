import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";

export default [
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "simple-import-sort": simpleImportSort,
      prettier: prettier,
    },
    rules: {
      ...Object.fromEntries(
        Object.entries(tsPlugin.configs.recommended.rules || {}).map(([key, value]) => [key, value])
      ),
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true }],
      "prettier/prettier": "warn",
    },
    settings: {
      "use client": "readonly",
    },
  },
  {
    ignores: [
      "**/node_modules/**",
      "**/.yarn/**",
      "**/out/**",
      "**/node_modules/*",
      "**/.cache/*",
      "**/.DS_Store",
      "**/.firebase/*",
      "**/.hugo_build.lock",
      "**/.idea/*",
      "**/.next/*",
      "**/.pnp.*",
      "**/.turbo/*",
      "**/.vagrant/*",
      "**/.vercel/*",
      "**/.vscode/*",
      "**/*.iml",
      "**/*.key.json",
      "**/*.log",
      "**/*.module-cache/*",
      "**/*.profi",
      "**/*.pyc",
      "**/*.pyo",
      "**/*.tsbuildinfo",
      "**/.env",
      "**/*.pem",
      "**/.yarn/*",
      "**/build/*",
      "**/builds/*",
      "**/coverage/*",
      "**/deps/*",
      "**/dist/*",
      "dist/*",
      "**/embed/*",
      "**/out/*",
      "**/private/*",
      "**/target/*",
      "**/temp/*",
      "**/tmp/*",
      "**/generated/*",
      "**/gen/*",
      "**/.open-next/*",
      "**/*example*",
      ".open-next/*",
      "packages/glade/platform.browser.ts",
      "packages/glade/platform.macos.ts",
    ],
  },
];
