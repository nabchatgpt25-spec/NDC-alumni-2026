import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

export const isDbConfigured = Boolean(process.env.SQL_HOST || process.env.DATABASE_URL);

export const createPool = () => {
  if (!global._postgresPool && isDbConfigured) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 3000,
    });

    global._postgresPool.on('error', (err) => {
      console.warn('Postgres client error:', err.message);
    });
  }
  return global._postgresPool;
};

let db: any;

try {
  if (isDbConfigured) {
    const pool = createPool();
    if (pool) {
      db = drizzle(pool, { schema });
    } else {
      throw new Error('Failed to create pool');
    }
  } else {
    throw new Error('Database environment variables not configured');
  }
} catch (err: any) {
  console.warn('[AI Studio] Database not configured or offline — using in-memory mock proxy layer');
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({}),
  };
  db = new Proxy(
    {},
    {
      get: (_, prop) =>
        prop === 'query'
          ? new Proxy({}, { get: () => noOp })
          : () => {
              const chain: any = {
                from: () => chain,
                where: () => chain,
                orderBy: () => chain,
                limit: () => chain,
                offset: () => chain,
                set: () => chain,
                values: () => chain,
                returning: () => Promise.resolve([]),
                then: (resolve: any) => Promise.resolve([]).then(resolve),
              };
              return chain;
            },
    }
  );
}

export { db };
