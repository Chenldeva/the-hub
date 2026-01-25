import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('tracking_returns', (table) => {
    table.increments('id').primary();
    table.string('source_marketplace', 50).notNullable();
    table.string('external_order_id', 255).notNullable();
    table.string('tracking_number', 255).notNullable();
    table.string('carrier', 100).nullable();
    table.string('service', 100).nullable();
    table.timestamp('ship_date').nullable();
    table.timestamp('returned_at').defaultTo(knex.fn.now());

    table.unique(['source_marketplace', 'external_order_id', 'tracking_number']);
  });

  await knex.schema.table('tracking_returns', (table) => {
    table.index('source_marketplace', 'idx_tracking_returns_marketplace');
    table.index(['source_marketplace', 'external_order_id'], 'idx_tracking_returns_order');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('tracking_returns');
}
