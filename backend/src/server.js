const config = require('./config');
const app = require('./app');

app.listen(config.port, () => {
  console.log(`Pratik Mov API em http://localhost:${config.port}`);
});
