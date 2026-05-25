const db = require('./db/oracle');
const oracledb = require('oracledb');

async function test() {
  await db.initialize();
  const conn = await db.getConnection();
  
  const r = await conn.execute('SELECT ccEmails, steps FROM requirements WHERE ROWNUM=1', [], {
    outFormat: oracledb.OUT_FORMAT_OBJECT
  });
  
  const row = r.rows[0];
  console.log('ccEmails type:', typeof row.CCEMAILS);
  console.log('ccEmails value:', row.CCEMAILS);
  console.log('steps type:', typeof row.STEPS);
  console.log('steps value:', row.STEPS);
  
  // Try parse
  try {
    JSON.parse(row.CCEMAILS);
    console.log('ccEmails is valid JSON string');
  } catch(e) {
    console.log('ccEmails is NOT JSON string:', e.message);
  }
  
  await conn.close();
  await db.close();
}

test();
