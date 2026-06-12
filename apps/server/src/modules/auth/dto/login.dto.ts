import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * 登录请求参数
 * username 支持用户名登录（后续可扩展手机号/邮箱）
 * password 为 RSA-OAEP 加密后的 base64 字符串（约 344 字符）
 */
export class LoginDto {
  @IsString()
  @MinLength(2, { message: '用户名至少 2 个字符' })
  @MaxLength(50)
  username: string;

  @IsString()
  @MinLength(8)
  @MaxLength(1024, { message: '密码格式错误' })
  password: string;
}
