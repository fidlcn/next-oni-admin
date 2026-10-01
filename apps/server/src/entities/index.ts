import { User } from './user.entity';
import { RefreshToken } from './refresh-token.entity';
import { Role } from './role.entity';
import { Permission } from './permission.entity';
import { Menu } from './menu.entity';
import { Category } from './category.entity';
import { Content } from './content.entity';
import { Media } from './media.entity';
import { Setting } from './setting.entity';
import { PagegenRecord } from './pagegen-record.entity';
import { PagegenToken } from './pagegen-token.entity';

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
  Setting,
  PagegenRecord,
  PagegenToken,
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
  Setting,
  PagegenRecord,
  PagegenToken,
};
