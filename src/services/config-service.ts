import { getDb } from '../config/database';
import { logger } from '../utils/logger';
import { Knex } from 'knex';

export type ConfigType = 
  | 'marketplace_ratio'
  | 'store_mapping'
  | 'oversell_policy'
  | 'safety_stock'
  | 'shadow_inventory';

export interface ConfigValue {
  key: string;
  value: string | number | boolean | object;
  type: ConfigType;
  description?: string;
}

export class ConfigService {
  private db: Knex;

  constructor() {
    this.db = getDb();
  }

  /**
   * 获取配置值
   */
  async getConfig(key: string): Promise<string | null> {
    try {
      const config = await this.db('configs')
        .where({ config_key: key })
        .first();

      return config ? config.config_value : null;
    } catch (error) {
      logger.error('Failed to get config', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 设置配置值
   */
  async setConfig(
    key: string,
    value: string | number | boolean | object,
    type: ConfigType,
    description?: string
  ): Promise<void> {
    try {
      const configValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      await this.db('configs')
        .insert({
          config_key: key,
          config_value: configValue,
          config_type: type,
          description: description || null,
          updated_at: this.db.fn.now(),
        })
        .onConflict('config_key')
        .merge({
          config_value: configValue,
          description: description || null,
          updated_at: this.db.fn.now(),
        });

      logger.info('Config updated', { key, type });
    } catch (error) {
      logger.error('Failed to set config', {
        key,
        type,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 获取 marketplace 分配比例
   */
  async getMarketplaceRatio(marketplace: string): Promise<number> {
    const value = await this.getConfig(`marketplace_ratio:${marketplace}`);
    return value ? parseFloat(value) : 1.0;
  }

  /**
   * 设置 marketplace 分配比例
   */
  async setMarketplaceRatio(marketplace: string, ratio: number): Promise<void> {
    await this.setConfig(
      `marketplace_ratio:${marketplace}`,
      ratio,
      'marketplace_ratio',
      `Marketplace ratio for ${marketplace}`
    );
  }

  /**
   * 获取 Store 映射（marketplace → ShipStation store_id）
   */
  async getStoreMapping(marketplace: string): Promise<number | null> {
    const value = await this.getConfig(`store_mapping:${marketplace}`);
    return value ? parseInt(value, 10) : null;
  }

  /**
   * 设置 Store 映射
   */
  async setStoreMapping(marketplace: string, storeId: number): Promise<void> {
    await this.setConfig(
      `store_mapping:${marketplace}`,
      storeId,
      'store_mapping',
      `Store mapping for ${marketplace} to ShipStation store_id`
    );
  }

  /**
   * 获取超卖策略配置
   */
  async getOversellPolicy(): Promise<{
    max_oversell_pct: number;
    max_oversell_abs: number | null;
  }> {
    const maxPct = await this.getConfig('oversell_policy:max_oversell_pct');
    const maxAbs = await this.getConfig('oversell_policy:max_oversell_abs');

    return {
      max_oversell_pct: maxPct ? parseFloat(maxPct) : 150,
      max_oversell_abs: maxAbs ? parseFloat(maxAbs) : null,
    };
  }

  /**
   * 设置超卖策略
   */
  async setOversellPolicy(maxOversellPct: number, maxOversellAbs: number | null = null): Promise<void> {
    await this.setConfig(
      'oversell_policy:max_oversell_pct',
      maxOversellPct,
      'oversell_policy',
      'Maximum oversell percentage (e.g., 150 = 150%)'
    );

    if (maxOversellAbs !== null) {
      await this.setConfig(
        'oversell_policy:max_oversell_abs',
        maxOversellAbs,
        'oversell_policy',
        'Maximum absolute oversell quantity'
      );
    }
  }

  /**
   * 获取安全库存配置
   */
  async getSafetyStock(): Promise<number> {
    const value = await this.getConfig('safety_stock:default');
    return value ? parseInt(value, 10) : 1;
  }

  /**
   * 设置安全库存
   */
  async setSafetyStock(value: number): Promise<void> {
    await this.setConfig(
      'safety_stock:default',
      value,
      'safety_stock',
      'Default safety stock value'
    );
  }

  /**
   * 获取影子库存配置
   */
  async getShadowInventoryConfig(): Promise<{
    low_stock_threshold: number;
    rebalance_interval_minutes: number;
  }> {
    const threshold = await this.getConfig('shadow_inventory:low_stock_threshold');
    const interval = await this.getConfig('shadow_inventory:rebalance_interval_minutes');

    return {
      low_stock_threshold: threshold ? parseInt(threshold, 10) : 1,
      rebalance_interval_minutes: interval ? parseInt(interval, 10) : 240,
    };
  }

  /**
   * 设置影子库存配置
   */
  async setShadowInventoryConfig(
    lowStockThreshold: number,
    rebalanceIntervalMinutes: number
  ): Promise<void> {
    await this.setConfig(
      'shadow_inventory:low_stock_threshold',
      lowStockThreshold,
      'shadow_inventory',
      'Low stock threshold for shadow inventory rebalance trigger'
    );

    await this.setConfig(
      'shadow_inventory:rebalance_interval_minutes',
      rebalanceIntervalMinutes,
      'shadow_inventory',
      'Shadow inventory rebalance interval in minutes'
    );
  }

  /**
   * 获取所有配置
   */
  async getAllConfigs(): Promise<ConfigValue[]> {
    try {
      const configs = await this.db('configs').select('*');
      return configs.map(config => ({
        key: config.config_key,
        value: this.parseConfigValue(config.config_value),
        type: config.config_type as ConfigType,
        description: config.description || undefined,
      }));
    } catch (error) {
      logger.error('Failed to get all configs', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private parseConfigValue(value: string): string | number | boolean | object {
    // 尝试解析为 JSON
    try {
      return JSON.parse(value);
    } catch {
      // 如果不是 JSON，尝试解析为数字
      if (/^-?\d+$/.test(value)) {
        return parseInt(value, 10);
      }
      if (/^-?\d*\.\d+$/.test(value)) {
        return parseFloat(value);
      }
      // 尝试解析为布尔值
      if (value === 'true' || value === 'false') {
        return value === 'true';
      }
      // 返回原始字符串
      return value;
    }
  }
}

export const configService = new ConfigService();
