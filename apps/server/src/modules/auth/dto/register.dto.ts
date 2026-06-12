import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEmail,
} from 'class-validator';

/**
 * 注册请求参数 —— 同时用于管理员创建用户
 * password 强度要求：至少 8 位，必须包含字母和数字
 */
export class RegisterDto {
  @IsString()
  @MinLength(2, { message: '用户名至少 2 个字符' })
  @MaxLength(50)
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(1024, { message: '密码格式错误' })
  password: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
