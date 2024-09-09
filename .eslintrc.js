module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es2022: true,
    },
    extends: ['standard-with-typescript', 'prettier'],
    plugins: ['prettier'],
    overrides: [
        {
            env: {
                node: true,
            },
            files: ['.eslintrc.{js,cjs}'],
            parserOptions: {
                sourceType: 'script',
            },
        },
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        project: './tsconfig.json',
    },
    rules: {
        'prettier/prettier': 'error',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/naming-convention': 'off',
        '@typescript-eslint/strict-boolean-expressions': 'off',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-extraneous-class': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/promise-function-async': 'off',
        '@typescript-eslint/return-await': 'off',
        '@typescript-eslint/no-misused-promises': 'off',
        '@typescript-eslint/no-invalid-void-type': 'off',
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        'prefer-promise-reject-errors': 'off',
        '@typescript-eslint/no-confusing-void-expression': 'off',
    },
};
