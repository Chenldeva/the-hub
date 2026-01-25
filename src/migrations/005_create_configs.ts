import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('configs', (table) => {
    table.increments('id').primary();
    table.string('config_key', 100).notNullable().unique();
    table.text('config_value').notNullable();
    table.string('config_type', 50).notNullable();
    table.text('description').nullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('configs', (table) => {
    table.index('config_key', 'idx_configs_key');
    table.index('config_type', 'idx_configs_type');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('configs');
}
