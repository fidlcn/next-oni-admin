import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

/**
 * 基础表结构 baseline —— 用户/角色/权限/菜单/CMS 等全部非 pagegen 表
 *
 * 背景：容器此前以 NODE_ENV=development（synchronize）运行，存量库的表由
 * synchronize 创建，没有迁移记录。因此本迁移做存在性检查：
 * - 存量库（已有 users 表）：整体跳过，不重复建表
 * - 全新库：按实体定义完整建表，使 NODE_ENV=production + migrationsRun 可从零启动
 */
export class CreateBaseSchema20260928000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 存量库判定：synchronize 建过的库直接跳过（幂等）
    if (await queryRunner.hasTable('users')) {
      return;
    }

    const timestamps = [
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
    ];
    const idColumn = {
      name: 'id',
      type: 'int',
      isPrimary: true,
      isGenerated: true,
      generationStrategy: 'increment' as const,
      comment: '自增主键',
    };

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          idColumn,
          {
            name: 'username',
            type: 'varchar',
            length: '50',
            isUnique: true,
            comment: '用户名，唯一',
          },
          {
            name: 'password',
            type: 'varchar',
            length: '255',
            comment: '密码（bcrypt 哈希）',
          },
          {
            name: 'email',
            type: 'varchar',
            length: '100',
            isNullable: true,
            isUnique: true,
            comment: '邮箱',
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
            isUnique: true,
            comment: '手机号',
          },
          {
            name: 'avatar',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: '头像 URL',
          },
          {
            name: 'status',
            type: 'tinyint',
            default: '1',
            comment: '状态：1=启用 0=禁用',
          },
          {
            name: 'login_attempts',
            type: 'int',
            default: '0',
            comment: '连续登录失败次数',
          },
          {
            name: 'lock_until',
            type: 'datetime',
            isNullable: true,
            comment: '锁定截止时间',
          },
          ...timestamps,
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'roles',
        columns: [
          idColumn,
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            isUnique: true,
            comment: '角色名称',
          },
          {
            name: 'description',
            type: 'varchar',
            length: '200',
            isNullable: true,
            comment: '角色描述',
          },
          { name: 'sort', type: 'int', default: '0', comment: '排序权重' },
          {
            name: 'status',
            type: 'tinyint',
            default: '1',
            comment: '状态：1=启用 0=禁用',
          },
          ...timestamps,
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'permissions',
        columns: [
          idColumn,
          {
            name: 'name',
            type: 'varchar',
            length: '50',
            comment: '权限显示名称',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '100',
            isUnique: true,
            comment: '权限编码',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            comment: '类型：menu/api/button',
          },
          {
            name: 'parent_id',
            type: 'int',
            isNullable: true,
            comment: '父权限 ID',
          },
          { name: 'sort', type: 'int', default: '0', comment: '排序权重' },
          {
            name: 'status',
            type: 'tinyint',
            default: '1',
            comment: '状态：1=启用 0=禁用',
          },
          ...timestamps,
        ],
      }),
      true,
    );

    // 用户-角色 / 角色-权限 关联表（复合主键，与 TypeORM @JoinTable 行为一致）
    await queryRunner.createTable(
      new Table({
        name: 'user_roles',
        columns: [
          { name: 'user_id', type: 'int', isPrimary: true },
          { name: 'role_id', type: 'int', isPrimary: true },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['role_id'],
            referencedTableName: 'roles',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'role_permissions',
        columns: [
          { name: 'role_id', type: 'int', isPrimary: true },
          { name: 'permission_id', type: 'int', isPrimary: true },
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['role_id'],
            referencedTableName: 'roles',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
          new TableForeignKey({
            columnNames: ['permission_id'],
            referencedTableName: 'permissions',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'refresh_tokens',
        columns: [
          idColumn,
          { name: 'user_id', type: 'int', comment: '关联用户 ID' },
          {
            name: 'token',
            type: 'varchar',
            length: '500',
            isUnique: true,
            comment: 'Token 值（UUID v4）',
          },
          { name: 'expires_at', type: 'datetime', comment: '过期时间' },
          {
            name: 'revoked_at',
            type: 'datetime',
            isNullable: true,
            comment: '吊销时间',
          },
          ...timestamps,
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['user_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'menus',
        columns: [
          idColumn,
          { name: 'name', type: 'varchar', length: '50', comment: '菜单名称' },
          {
            name: 'path',
            type: 'varchar',
            length: '200',
            isNullable: true,
            comment: '路由路径',
          },
          {
            name: 'icon',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '图标名称',
          },
          {
            name: 'parent_id',
            type: 'int',
            isNullable: true,
            comment: '父菜单 ID',
          },
          { name: 'sort', type: 'int', default: '0', comment: '排序权重' },
          {
            name: 'type',
            type: 'tinyint',
            default: '1',
            comment: '类型：0=目录 1=菜单 2=外链',
          },
          {
            name: 'status',
            type: 'tinyint',
            default: '1',
            comment: '状态：1=显示 0=隐藏',
          },
          {
            name: 'permission_code',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: '关联权限编码',
          },
          ...timestamps,
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          idColumn,
          { name: 'name', type: 'varchar', length: '50', comment: '分类名称' },
          {
            name: 'parent_id',
            type: 'int',
            isNullable: true,
            comment: '父分类 ID',
          },
          { name: 'sort', type: 'int', default: '0', comment: '排序权重' },
          {
            name: 'type',
            type: 'varchar',
            length: '30',
            default: "'default'",
            comment: '分类类型',
          },
          {
            name: 'status',
            type: 'tinyint',
            default: '1',
            comment: '状态：1=启用 0=禁用',
          },
          ...timestamps,
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'contents',
        columns: [
          idColumn,
          { name: 'title', type: 'varchar', length: '200', comment: '标题' },
          { name: 'content', type: 'longtext', comment: '内容正文' },
          {
            name: 'category_id',
            type: 'int',
            isNullable: true,
            comment: '所属分类 ID',
          },
          { name: 'author_id', type: 'int', comment: '作者用户 ID' },
          {
            name: 'cover',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: '封面图 URL',
          },
          {
            name: 'status',
            type: 'tinyint',
            default: '0',
            comment: '状态：0=草稿 1=已发布',
          },
          {
            name: 'published_at',
            type: 'datetime',
            isNullable: true,
            comment: '发布时间',
          },
          ...timestamps,
        ],
        indices: [
          new TableIndex({
            name: 'idx_contents_created_at',
            columnNames: ['created_at'],
          }),
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['category_id'],
            referencedTableName: 'categories',
            referencedColumnNames: ['id'],
          }),
          new TableForeignKey({
            columnNames: ['author_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
          }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'media',
        columns: [
          idColumn,
          {
            name: 'name',
            type: 'varchar',
            length: '200',
            comment: '文件原始名称',
          },
          {
            name: 'url',
            type: 'varchar',
            length: '500',
            comment: '文件访问 URL',
          },
          {
            name: 'type',
            type: 'varchar',
            length: '20',
            comment: '类型：image/video/file',
          },
          { name: 'size', type: 'bigint', comment: '文件大小（字节）' },
          { name: 'uploader_id', type: 'int', comment: '上传者用户 ID' },
          ...timestamps,
        ],
        foreignKeys: [
          new TableForeignKey({
            columnNames: ['uploader_id'],
            referencedTableName: 'users',
            referencedColumnNames: ['id'],
          }),
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'settings',
        columns: [
          idColumn,
          {
            name: 'key',
            type: 'varchar',
            length: '100',
            isUnique: true,
            comment: '设置键',
          },
          { name: 'value', type: 'text', isNullable: true, comment: '设置值' },
          {
            name: 'group',
            type: 'varchar',
            length: '30',
            default: "'default'",
            comment: '设置分组',
          },
          {
            name: 'description',
            type: 'varchar',
            length: '200',
            isNullable: true,
            comment: '设置说明',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // baseline 不支持回滚（会连带删数据）；如需重建请手动处理
    void queryRunner;
  }
}
