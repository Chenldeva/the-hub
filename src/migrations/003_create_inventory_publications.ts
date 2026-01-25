import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('inventory_publications', (table) => {
    table.increments('id').primary();
    table.string('sku', 255).notNullable();
    table.string('marketplace', 50).notNullable();
    table.integer('published_qty').notNullable();
    table.timestamp('published_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('inventory_publications', (table) => {
    table.index('sku', 'idx_inventory_publications_sku');
    table.index('marketplace', 'idx_inventory_publications_marketplace');
    table.index(['sku', 'marketplace', 'published_at'], 'idx_inventory_publications_sku_marketplace');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('inventory_publications');
}
