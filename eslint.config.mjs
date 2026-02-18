import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
  {
    rules: {
      'import/no-anonymous-default-export': 'off',
      '@next/next/no-img-element': 'off',
      '@next/next/no-page-custom-font': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    ignores: [
      'archive/**',
      'tmp_*.html',
      'temp_test_import.js',
      'updated-suggest-business-function.ts',
    ],
  },
];
