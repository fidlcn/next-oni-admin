import { IsOptional, IsInt, IsString, MaxLength, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/** 内容列表查询（公开/管理端共用） */
export class QueryContentDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1])
  status?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;
}
