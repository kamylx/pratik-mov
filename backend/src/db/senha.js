// Define uma senha nova para um usuário (até existir "esqueci a senha" no app).
// Uso: npm run senha -- email@exemplo.com NovaSenha123
const bcrypt = require('bcryptjs');
const { pool } = require('./pool');

const [email, senha] = process.argv.slice(2);
if (!email || !senha || senha.length < 8) {
  console.error('Uso: npm run senha -- email@exemplo.com NovaSenha123 (mínimo de 8 caracteres)');
  process.exit(1);
}
bcrypt.hash(senha, 12)
  .then((hash) => pool.query('UPDATE usuarios SET senha_hash = $1 WHERE email = $2 RETURNING email', [hash, email.toLowerCase()]))
  .then(({ rows }) => {
    console.log(rows[0] ? `Senha de ${rows[0].email} alterada.` : 'Usuário não encontrado.');
    return pool.end();
  })
  .catch((err) => { console.error(err.message); process.exit(1); });
