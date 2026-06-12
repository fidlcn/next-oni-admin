import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
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
  @MinLength(8, { message: '密码至少 8 位' })
  @MaxLength(50)
  @Matches(
    /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d!@#$%^&*()_+\-=[\]{};:'",.<>?/\\|`~]{8,}$/,
    {
      message: '密码必须包含字母和数字',
    },
  )
  password: string;

  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
