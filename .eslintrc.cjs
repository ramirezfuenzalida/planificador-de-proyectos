module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-explicit-any': 'warn', // Nivel Senior: Evitar 'any'
    'no-console': ['warn', { allow: ['warn', 'error'] }], // Evitar logs innecesarios
    'prefer-const': 'error', // Inmutabilidad por defecto
    'no-unused-vars': 'off', // Usamos la de TS
    '@typescript-eslint/no-unused-vars': ['error'], // Limpieza de código
    'semi': ['error', 'always'], // Consistencia
    'quotes': ['error', 'single'], // Estilo profesional
  },
}
