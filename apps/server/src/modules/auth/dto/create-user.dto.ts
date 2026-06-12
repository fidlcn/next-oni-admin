import { IsArray, IsOptional, IsNumber } from 'class-validator';
import { RegisterDto } from './register.dto';

/**
 * 管理员创建用户 DTO —— 继承注册字段，额外支持分配角色
 */
export class CreateUserDto extends RegisterDto {
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  roleIds?: number[];
}
