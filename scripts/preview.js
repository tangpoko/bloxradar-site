// Runs the site locally on the test data in data/fixture.json (make it with `npm run fixture`).
process.env.DATA_SOURCE = 'fixture';
await import('../server.js');
