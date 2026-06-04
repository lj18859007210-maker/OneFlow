const assert = require('assert');
const Module = require('module');

async function run() {
  const originalLoad = Module._load;
  const store = new Map();

  Module._load = function(request, parent, isMain) {
    if (request === './systemSetting') {
      return {
        getValue: async (key, fallback) => store.has(key) ? store.get(key) : fallback,
        setValue: async (key, value) => {
          store.set(key, value);
          return { key, value };
        }
      };
    }
    return originalLoad.apply(this, arguments);
  };

  try {
    delete require.cache[require.resolve('./models/platformSetting')];
    const platformSettingModel = require('./models/platformSetting');

    const defaults = await platformSettingModel.getPlatforms();
    assert.deepStrictEqual(defaults, [
      {
        name: '默认平台',
        children: [
          'CRM 系统',
          'BOSS 系统',
          'OA 办公系统',
          '网管支撑平台',
          '大数据分析平台',
          '掌上移动 APP'
        ]
      }
    ]);

    const updated = await platformSettingModel.updatePlatforms([
      {
        name: ' Jkstore ',
        children: [' A平台 ', 'B平台', 'A平台', '']
      },
      {
        name: '业务平台',
        children: ['C平台']
      }
    ]);
    assert.deepStrictEqual(updated, [
      { name: 'Jkstore', children: ['A平台', 'B平台'] },
      { name: '业务平台', children: ['C平台'] }
    ]);

    const stored = await platformSettingModel.getPlatforms();
    assert.deepStrictEqual(stored, [
      { name: 'Jkstore', children: ['A平台', 'B平台'] },
      { name: '业务平台', children: ['C平台'] }
    ]);

    store.set('requirement.platforms', JSON.stringify(['CRM 系统', 'BOSS 系统']));
    const migrated = await platformSettingModel.getPlatforms();
    assert.deepStrictEqual(migrated, [
      { name: '默认平台', children: ['CRM 系统', 'BOSS 系统'] }
    ]);

    await assert.rejects(
      () => platformSettingModel.updatePlatforms([{ name: '', children: [''] }]),
      /至少保留一个平台/
    );

    console.log('platform setting model tests passed');
  } finally {
    Module._load = originalLoad;
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
