import knex, { Knex } from 'knex';
import config from '../knexfile';

const environment = process.env.NODE_ENV || 'development';
const dbConfig = config[environment as keyof typeof config];

let dbInstance: Knex | null = null;

export function getDb(): Knex {
  if (!dbInstance) {
    dbInstance = knex(dbConfig);
  }
  return dbInstance;
}

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy();
    dbInstance = null;
  }
}
