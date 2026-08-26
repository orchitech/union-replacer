import { FlatCompat } from '@eslint/eslintrc';
import jsdoc from 'eslint-plugin-jsdoc';

const compat = new FlatCompat({ baseDirectory: process.cwd() });

// eslint-config-airbnb-base is eslintrc-only and still configures `valid-jsdoc` and
// `require-jsdoc`, which have been removed from ESLint core. Strip them so that the
// rest of the Airbnb rules can be consumed from a flat config.
const airbnbBase = compat.extends('airbnb-base').map((config) => {
  if (!config.rules) {
    return config;
  }
  const { 'valid-jsdoc': validJsdoc, 'require-jsdoc': requireJsdoc, ...rules } = config.rules;
  return { ...config, rules };
});

export default [
  { ignores: ['dist/'] },
  ...airbnbBase,
  jsdoc.configs['flat/recommended'],
  {
    rules: {
      'no-plusplus': 'off',
      'no-cond-assign': ['error', 'except-parens'],
      'no-unused-expressions': ['error', { allowShortCircuit: true }],
      // airbnb-base v15 switched this to 'multiline-arguments', which conflicts
      // with the layout used throughout this code base.
      'function-paren-newline': ['error', 'consistent'],
      'jsdoc/require-jsdoc': ['warn', {
        publicOnly: true,
      }],
      'jsdoc/no-undefined-types': ['warn', {
        definedTypes: [
          'UnionReplacer',
          'UnionReplacer.ReplaceTuple',
          'UnionReplacer.ReplacementBuilder',
          'RegExpExecArray',
          'true',
          'false',
          'T',
        ],
      }],
      'jsdoc/check-tag-names': ['warn', {
        definedTags: ['template'],
      }],
      // jsdoc/check-examples cannot be enabled as a rule on ESLint 8+, see
      // https://github.com/gajus/eslint-plugin-jsdoc/blob/main/docs/rules/check-examples.md
      'jsdoc/check-syntax': 1,
      'jsdoc/match-description': 1,
      // Successor of jsdoc/newline-after-description: keep one blank line between
      // the block description and the first tag.
      'jsdoc/tag-lines': ['warn', 'never', { startLines: 1 }],
      // Documenting parameter defaults is intentional here.
      'jsdoc/no-defaults': 'off',
      // `*` is used deliberately for genuinely unconstrained values.
      'jsdoc/reject-any-type': 'off',
      'jsdoc/require-description': ['warn', {
        exemptedBy: ['inheritdoc', 'private', 'deprecated', 'hideconstructor'],
      }],
      'jsdoc/require-description-complete-sentence': 1,
      'jsdoc/require-param': ['warn', {
        exemptedBy: ['inheritdoc', 'hideconstructor'],
      }],
      'jsdoc/require-example': ['warn', {
        contexts: [
          "ClassDeclaration[id.name='UnionReplacer'] > ClassBody > MethodDefinition",
        ],
        exemptedBy: ['inheritdoc', 'private', 'deprecated'],
      }],
      'jsdoc/require-hyphen-before-param-description': 1,
    },
    settings: {
      jsdoc: {
        mode: 'jsdoc',
        tagNamePreference: {
          function: 'method',
        },
      },
    },
  },
  {
    // Build and lint configuration written as native ES modules.
    files: ['*.mjs'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
  },
  {
    // jsdoc injects `env` into its JS configuration files.
    files: ['.jsdoc.conf.js'],
    languageOptions: { globals: { env: 'readonly' } },
  },
  {
    files: ['test/**'],
    languageOptions: compat.env({ jasmine: true })[0].languageOptions,
    rules: {
      'import/no-unresolved': 'off',
      'no-cond-assign': ['error', 'except-parens'],
    },
  },
];
