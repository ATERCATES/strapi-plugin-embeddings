
const path = require('path');

const getConnection = (client, env) => {
  switch(client) {
    case 'postgres':
      return {
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'bank'),
        user: env('DATABASE_USERNAME', 'postgres'),
        password: env('DATABASE_PASSWORD', '0000'),
        schema: env('DATABASE_SCHEMA', 'public'), // Not required
        ssl: env.bool('DATABASE_SSL_SELF', false)
          ? { rejectUnauthorized: false } // SSL activo, no valida certificado (Cifra conexión)
          : false,                        // SSL desactivado
    };
    case 'sqlite':
      return {
        filename: path.join(__dirname, '..', env('DATABASE_FILENAME', '.tmp/data.db'))
      }
  };
}

module.exports = ({ env }) => {
  const client = env('DATABASE_CLIENT') || 'sqlite';
  return {
    connection: {
      client,
      connection: getConnection(client, env),
      useNullAsDefault: client === 'sqlite' ? true : false,
      debug: false,
    }
  };
};
