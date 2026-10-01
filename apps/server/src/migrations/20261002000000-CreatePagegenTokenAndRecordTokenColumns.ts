import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableIndex,
  TableUnique,
} from 'typeorm';

/**
 * 创建托管页生成口令表，并为生成记录补充口令/设备关联列
 * 开发环境由 synchronize 自动同步；生产环境启动时执行本迁移
 */
export class CreatePagegenTokenAndRecordTokenColumns20261002000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pagegen_tokens',
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
            name: 'code',
            type: 'varchar',
            length: '32',
            isUnique: true,
            comment: '口令本体（随机码，即邀请短链标识）',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            default: "''",
            comment: '备注名（如：给小王的）',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '10',
            comment: '类型：long（长期限频）/ short（短期限量）',
          },
          {
            name: 'hourly_limit',
            type: 'int',
            isNullable: true,
            comment: 'long 型：每小时最多生成条数',
          },
          {
            name: 'max_uses',
            type: 'int',
            isNullable: true,
            comment: 'short 型：累计最多生成条数',
          },
          {
            name: 'status',
            type: 'varchar',
            length: '16',
            default: "'active'",
            comment: '状态：active/disabled（耗尽由用量推导，不落库）',
          },
          {
            name: 'active_device_id',
            type: 'varchar',
            length: '64',
            isNullable: true,
            comment: '当前占用设备 ID（单设备独占）',
          },
          {
            name: 'device_bound_at',
            type: 'datetime',
            isNullable: true,
            comment: '设备绑定时间',
          },
          {
            name: 'last_used_at',
            type: 'datetime',
            isNullable: true,
            comment: '最近一次提交时间（空闲自动释放依据）',
          },
          {
            name: 'created_by',
            type: 'int',
            isNullable: true,
            comment: '创建管理员用户 ID',
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
        indices: [
          new TableIndex({
            name: 'idx_pagegen_token_created',
            columnNames: ['created_at'],
          }),
        ],
        uniques: [
          new TableUnique({
            name: 'uk_pagegen_token_code',
            columnNames: ['code'],
          }),
        ],
      }),
      true,
    );

    const records = 'pagegen_records';
    await queryRunner.addColumn(
      records,
      new TableColumn({
        name: 'token_id',
        type: 'int',
        isNullable: true,
        comment: '使用的口令 ID（null = 管理员 env 口令）',
      }),
    );
    await queryRunner.addColumn(
      records,
      new TableColumn({
        name: 'device_id',
        type: 'varchar',
        length: '64',
        isNullable: true,
        comment: '提交设备 ID（前端 localStorage 持久化）',
      }),
    );
    await queryRunner.createIndex(
      records,
      new TableIndex({
        name: 'idx_pagegen_tokenid_created',
        columnNames: ['token_id', 'created_at'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'pagegen_records',
      'idx_pagegen_tokenid_created',
    );
    await queryRunner.dropColumn('pagegen_records', 'device_id');
    await queryRunner.dropColumn('pagegen_records', 'token_id');
    await queryRunner.dropTable('pagegen_tokens', true);
  }
}
