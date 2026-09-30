const app = require('./app');
const store = require('./gh_store');
const { seed } = require('./seed');

// the task's requirement tests assume seeded accounts/orgs/repos/issues exist
seed(store);

const defaultPort = 3000;
const port = Number(process.env.PORT || defaultPort);

app.listen(port, () => {
  console.log(`Backend listening at http://127.0.0.1:${port}`);
});
