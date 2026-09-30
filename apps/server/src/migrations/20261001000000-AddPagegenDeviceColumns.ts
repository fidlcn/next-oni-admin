import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * 托管页记录新增设备特征列（UA 解析结果，独立字段便于管理端分列展示）
 * 开发环境由 synchronize 自动同步；生产环境启动时执行本迁移
 */
export class AddPagegenDeviceColumns20261001000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = 'pagegen_records';
    await queryRunner.addColumn(
      table,
      new TableColumn({
        name: 'device_type',
        type: 'varchar',
        length: '16',
        isNullable: true,
        comment: '设备类型：mobile/tablet/desktop',
      }),
    );
    await queryRunner.addColumn(
      table,
      new TableColumn({
        name: 'browser',
        type: 'varchar',
        length: '64',
        isNullable: true,
        comment: '浏览器（名称+主版本）',
      }),
    );
    await queryRunner.addColumn(
      table,
      new TableColumn({
        name: 'os',
        type: 'varchar',
        length: '64',
        isNullable: true,
        comment: '操作系统',
      }),
    );
    await queryRunner.addColumn(
      table,
      new TableColumn({
        name: 'device_model',
        type: 'varchar',
        length: '64',
        isNullable: true,
        comment: '机型',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = 'pagegen_records';
    await queryRunner.dropColumn(table, 'device_model');
    await queryRunner.dropColumn(table, 'os');
    await queryRunner.dropColumn(table, 'browser');
    await queryRunner.dropColumn(table, 'device_type');
  }
}
