import {
  IsOptional,
  IsString,
  IsInt,
  IsIn,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';

export class CreateMenuDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @ValidateIf((o) => o.path != null)
  @IsString()
  @MaxLength(200)
  path?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.icon != null)
  @IsString()
  @MaxLength(50)
  icon?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;

  /** 类型：0=目录 1=菜单页面 2=外链 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1, 2])
  type?: number;

  /** 状态：1=显示 0=隐藏 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1])
  status?: number;

  @IsOptional()
  @ValidateIf((o) => o.permissionCode != null)
  @IsString()
  @MaxLength(100)
  permissionCode?: string | null;
}

export class UpdateMenuDto extends PartialType(CreateMenuDto) {}
