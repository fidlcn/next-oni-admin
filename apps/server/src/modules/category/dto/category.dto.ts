import { IsOptional, IsString, IsInt, IsIn, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';

export class CreateCategoryDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1])
  status?: number;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
