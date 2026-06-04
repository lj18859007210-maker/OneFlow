const assert = require('assert');
const dotenv = require('dotenv');

function run() {
  const originalConfig = dotenv.config;
  const originalWarn = console.warn;
  const calls = [];
  delete require.cache[require.resolve('./config')];

  dotenv.config = options => {
    calls.push(options);
    return { parsed: {} };
  };
  console.warn = () => {};

  try {
    require('./config');
    assert.deepStrictEqual(calls[0], { quiet: true });
    console.log('config dotenv tests passed');
  } finally {
    dotenv.config = originalConfig;
    console.warn = originalWarn;
    delete require.cache[require.resolve('./config')];
  }
}

try {
  run();
} catch (error) {
  console.error(error);
  process.exit(1);
}
