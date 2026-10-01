import {
  IsOptional,
  IsString,
  IsInt,
  IsIn,
  IsArray,
  ArrayMinSize,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';

export * from './query-content.dto';

export class CreateContentDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number | null;

  @IsOptional()
  @ValidateIf((o) => o.cover != null)
  @IsString()
  @MaxLength(500)
  cover?: string | null;

  /** 状态：0=草稿 1=已发布 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1])
  status?: number;
}

export class UpdateContentDto extends PartialType(CreateContentDto) {}

/** 批量更新状态 */
export class BatchStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  ids: number[];

  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1])
  status: number;
}

/** 批量删除 */
export class BatchIdsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  ids: number[];
}
