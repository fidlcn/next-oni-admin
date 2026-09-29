import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

/**
 * 创建托管页生成记录表
 * 开发环境由 synchronize 自动建表；生产环境 migrationsRun 在启动时执行本迁移
 */
export class CreatePagegenRecord20260930000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pagegen_records',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
            comment: '自增主键',
          },
          {
            name: 'page_id',
            type: 'varchar',
            length: '16',
            isUnique: true,
            comment: '页面 ID（URL 标识）',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '100',
            comment: '页面标题',
          },
          { name: 'tags', type: 'json', comment: '主题标签（预设内 1-3 个）' },
          { name: 'style', type: 'varchar', length: '32', comment: '风格标识' },
          {
            name: 'content',
            type: 'text',
            comment: '用户输入的正文（提示词主体）',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '20',
            default: "'pending'",
            comment: '状态：pending/generating/done/failed',
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
            comment: '失败原因（友好文案）',
          },
          {
            name: 'ip',
            type: 'varchar',
            length: '64',
            isNullable: true,
            comment: '提交者 IP',
          },
          {
            name: 'model',
            type: 'varchar',
            length: '64',
            isNullable: true,
            comment: '生成使用的模型',
          },
          {
            name: 'tokens_in',
            type: 'int',
            default: 0,
            comment: '输入 tokens',
          },
          {
            name: 'tokens_out',
            type: 'int',
            default: 0,
            comment: '输出 tokens',
          },
          {
            name: 'views',
            type: 'int',
            default: 0,
            comment: '浏览数（点击埋点近似值）',
          },
          {
            name: 'created_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            comment: '创建时间',
          },
          {
            name: 'updated_at',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            comment: '更新时间',
          },
        ],
      }),
      true,
    );

    // 频控统计（按 IP + 日期范围查询）需要 ip + created_at 索引
    await queryRunner.createIndex(
      'pagegen_records',
      new TableIndex({
        name: 'idx_pagegen_ip_created',
        columnNames: ['ip', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pagegen_records', true);
  }
}
