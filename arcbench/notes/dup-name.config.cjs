module.exports = {
  testDir: 'D:/gosim-demo-26/arcbench/upstream/smoke/github',
  testMatch: 'dup-name-probe.spec.ts',
  timeout: 180000,
  workers: 1,
  use: {
    headless: true,
    baseURL: process.env.TARGET_URL || 'http://127.0.0.1:3301',
  },
  reporter: [['list']],
  outputDir: 'D:/gosim-demo-26/arcbench/runs/dup-name-results',
};
