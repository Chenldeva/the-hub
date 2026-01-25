import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  // 检查是否已有数据，避免重复插入
  const existing = await knex('configs').count('* as count').first();
  if (existing && Number(existing.count) > 0) {
    console.log('Configs already seeded, skipping...');
    return;
  }

  await knex('configs').insert([
    // Marketplace 分配比例（初始值 1.0）
    {
      config_key: 'marketplace_ratio:amazon',
      config_value: '1.0',
      config_type: 'marketplace_ratio',
      description: 'Marketplace ratio for Amazon (initial value, can be adjusted later)',
      updated_at: knex.fn.now(),
    },
    // Store 映射（Amazon → ShipStation store_id = 324727）
    {
      config_key: 'store_mapping:amazon',
      config_value: '324727',
      config_type: 'store_mapping',
      description: 'Store mapping for Amazon to ShipStation store_id',
      updated_at: knex.fn.now(),
    },
    // 超卖策略
    {
      config_key: 'oversell_policy:max_oversell_pct',
      config_value: '150',
      config_type: 'oversell_policy',
      description: 'Maximum oversell percentage (150 = 150%)',
      updated_at: knex.fn.now(),
    },
    {
      config_key: 'oversell_policy:max_oversell_abs',
      config_value: 'null',
      config_type: 'oversell_policy',
      description: 'Maximum absolute oversell quantity (not used)',
      updated_at: knex.fn.now(),
    },
    // 安全库存
    {
      config_key: 'safety_stock:default',
      config_value: '1',
      config_type: 'safety_stock',
      description: 'Default safety stock value',
      updated_at: knex.fn.now(),
    },
    // 影子库存配置
    {
      config_key: 'shadow_inventory:low_stock_threshold',
      config_value: '1',
      config_type: 'shadow_inventory',
      description: 'Low stock threshold for shadow inventory rebalance trigger',
      updated_at: knex.fn.now(),
    },
    {
      config_key: 'shadow_inventory:rebalance_interval_minutes',
      config_value: '240',
      config_type: 'shadow_inventory',
      description: 'Shadow inventory rebalance interval in minutes (4 hours)',
      updated_at: knex.fn.now(),
    },
  ]);

  console.log('Initial configs seeded successfully');
}
