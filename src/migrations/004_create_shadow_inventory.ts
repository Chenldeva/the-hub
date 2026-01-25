import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('shadow_inventory', (table) => {
    table.increments('id').primary();
    table.string('sku', 255).notNullable().unique();
    table.integer('shadow_qty').notNullable().defaultTo(0);
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('shadow_inventory', (table) => {
    table.index('sku', 'idx_shadow_inventory_sku');
    table.index('updated_at', 'idx_shadow_inventory_updated');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('shadow_inventory');
}
