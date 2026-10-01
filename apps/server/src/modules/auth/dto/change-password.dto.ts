import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * 修改自己的密码 —— oldPassword/newPassword 均为 RSA-OAEP 加密后的 base64
 */
export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  @MaxLength(1024, { message: '原密码格式错误' })
  oldPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(1024, { message: '新密码格式错误' })
  newPassword: string;
}
