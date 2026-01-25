import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('order_mappings', (table) => {
    table.increments('id').primary();
    table.string('source_marketplace', 50).notNullable();
    table.string('external_order_id', 255).notNullable();
    table.integer('shipstation_order_id').notNullable();
    table.integer('shipstation_store_id').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.unique(['source_marketplace', 'external_order_id']);
  });

  await knex.schema.table('order_mappings', (table) => {
    table.index('source_marketplace', 'idx_order_mappings_marketplace');
    table.index('shipstation_order_id', 'idx_order_mappings_shipstation_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('order_mappings');
}
