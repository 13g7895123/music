import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'playwright-report/**']
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
        YT: 'readonly'
      }
    },
    rules: {
      'vue/multi-word-component-names': 'off',

      // <script setup> 中 `const props = defineProps(...)` 若只在 template 或
      // computed 內以 props.x 使用，base no-unused-vars 會誤判為未使用。
      // 忽略 props/emit 這類慣例命名，其餘未使用變數仍然報錯。
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^(props|emit)$',
        args: 'after-used',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],

      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      // 既有程式碼有多處超長行，設為 warn 讓它可見但不擋 CI；
      // 逐步整理完後可再調回 error。
      'vue/max-len': ['warn', {
        code: 120,
        template: 120,
        ignoreUrls: true
      }]
    }
  },

  // 測試檔：允許 vitest / playwright 的全域變數
  {
    files: ['tests/**/*.{js,vue}', '**/*.{spec,test}.{js,vue}'],
    languageOptions: {
      globals: {
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly'
      }
    }
  }
]
