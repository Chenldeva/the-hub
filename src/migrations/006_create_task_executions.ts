import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('task_executions', (table) => {
    table.increments('id').primary();
    table.string('task_type', 50).notNullable();
    table.string('task_name', 100).notNullable();
    table.string('status', 20).notNullable(); // 'pending', 'running', 'success', 'failed'
    table.timestamp('started_at').nullable();
    table.timestamp('completed_at').nullable();
    table.integer('records_processed').defaultTo(0);
    table.integer('records_failed').defaultTo(0);
    table.text('error_message').nullable();
    table.jsonb('metadata').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.table('task_executions', (table) => {
    table.index('task_type', 'idx_task_executions_type');
    table.index('status', 'idx_task_executions_status');
    table.index('created_at', 'idx_task_executions_created');
    table.index(['task_name', 'status'], 'idx_task_executions_name_status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('task_executions');
}
