module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/ai-concurrency.spec.ts'],
  forceExit: true,
  detectOpenHandles: false,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
