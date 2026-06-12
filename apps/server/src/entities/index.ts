import { User } from './user.entity';
import { RefreshToken } from './refresh-token.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { Menu } from './menu.entity';
import { Category } from './category.entity';
import { Content } from './content.entity';
import { Media } from './media.entity';
import { OperationLog } from './operation-log.entity';
import { Setting } from './setting.entity';

// TypeORM 需要的实体数组，用于自动加载所有表
export const entities = [
  User,
  RefreshToken,
  Role,
  Permission,
  Menu,
  Category,
  Content,
  Media,
  OperationLog,
  Setting,
];

export {
  User,
  RefreshToken,
  Role,
  Permission,
  Menu,
  Category,
  Content,
  Media,
  OperationLog,
  Setting,
};
