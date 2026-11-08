require('dotenv').config();

const config = {
  port: Number(process.env.PORT || 3001),
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2h',
  isProduction: process.env.NODE_ENV === 'production',
  limiteGratuito: Number(process.env.LIMITE_GRATUITO || 10),
};

// Falha cedo: sem segredo forte, o servidor não sobe.
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL não definida. Copie .env.example para .env.');
}
if (!config.jwtSecret || config.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET ausente ou curto (mínimo 32 caracteres).');
}

module.exports = config;
