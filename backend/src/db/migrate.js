const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function migrar() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

if (require.main === module) {
  migrar()
    .then(() => { console.log('Banco atualizado.'); return pool.end(); })
    .catch((err) => { console.error('Erro na migração:', err.message); process.exit(1); });
}

module.exports = { migrar };
