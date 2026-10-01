import {
  IsOptional,
  IsEmail,
  IsString,
  IsInt,
  IsIn,
  IsArray,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 管理员更新用户（不含密码；密码走 reset-password 专用端点） */
export class UpdateUserDto {
  @IsOptional()
  @ValidateIf((o) => o.email != null)
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(100)
  email?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.phone != null)
  @IsString()
  @MaxLength(20)
  phone?: string | null;

  @IsOptional()
  @ValidateIf((o) => o.avatar != null)
  @IsString()
  @MaxLength(500)
  avatar?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1], { message: 'status 只能是 0 或 1' })
  status?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  roleIds?: number[];
}
