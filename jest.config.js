module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["./test/mock-console.ts"],
  setupFilesAfterEnv: ["./test/reset.ts"],
};
