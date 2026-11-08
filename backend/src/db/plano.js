// Muda o plano de um usuário (uso em desenvolvimento, até a cobrança ser integrada).
// Uso: npm run plano -- email@exemplo.com pro|gratuito
const { pool } = require('./pool');

const [email, plano] = process.argv.slice(2);
if (!email || !['pro', 'gratuito'].includes(plano)) {
  console.error('Uso: npm run plano -- email@exemplo.com pro|gratuito');
  process.exit(1);
}
pool.query('UPDATE usuarios SET plano = $1 WHERE email = $2 RETURNING email, plano', [plano, email.toLowerCase()])
  .then(({ rows }) => {
    console.log(rows[0] ? `${rows[0].email} agora está no plano ${rows[0].plano}.` : 'Usuário não encontrado.');
    return pool.end();
  })
  .catch((err) => { console.error(err.message); process.exit(1); });
