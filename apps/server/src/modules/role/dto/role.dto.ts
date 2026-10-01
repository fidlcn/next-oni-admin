import {
  IsOptional,
  IsString,
  IsInt,
  IsIn,
  IsArray,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';

export class CreateRoleDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @ValidateIf((o) => o.description != null)
  @IsString()
  @MaxLength(200)
  description?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1])
  status?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  permissionIds?: number[];
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
