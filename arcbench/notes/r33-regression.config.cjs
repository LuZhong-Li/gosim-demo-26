module.exports = {
  testDir: 'D:/gosim-demo-26/arcbench/upstream/smoke/github',
  testMatch: 'r33-regression.spec.ts',
  timeout: 60000,
  workers: 1,
  use: {
    headless: true,
    baseURL: process.env.TARGET_URL || 'http://127.0.0.1:3301',
  },
  reporter: [['list']],
  outputDir: 'D:/gosim-demo-26/arcbench/runs/r33-regression-results',
};
