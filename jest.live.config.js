// Live integration tests run WITHOUT jest-expo: its setup installs Expo's fetch
// polyfill, which never reaches the network under jest. Node's own fetch does.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/live.test.ts'],
  transform: { '^.+\\.(m?[jt]sx?)$': ['babel-jest', { presets: [require.resolve('babel-preset-expo', { paths: [require.resolve('expo')] })] }] },
  transformIgnorePatterns: ['node_modules/(?!(openapi-fetch|expo)/)'],
};
