module.exports = {
  // Use react-native preset directly instead of jest-expo.
  // jest-expo SDK 54 loads Expo's winter runtime which is incompatible
  // with Jest 30's module sandbox (triggers "import outside scope" errors).
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|react-native-paper|react-native-vector-icons|react-native-gesture-handler|@react-native-async-storage/.*|@tanstack/.*|@ungap/.*|react-native-safe-area-context))'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@fridge-manager/shared$': '<rootDir>/../../packages/shared/dist/index.js',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
