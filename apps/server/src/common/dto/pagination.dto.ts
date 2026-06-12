import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

// 分页默认值 —— 与 packages/constants 保持同步
const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * 通用分页查询参数 DTO
 * 所有列表接口的查询参数都继承或复用此类
 * 默认 page=1, pageSize=20, 最大 pageSize=100 防止一次查太多数据
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page 必须是整数' })
  @Min(1, { message: 'page 最小为 1' })
  page: number = DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize 必须是整数' })
  @Min(1, { message: 'pageSize 最小为 1' })
  @Max(MAX_PAGE_SIZE, {
    message: `pageSize 最大为 ${MAX_PAGE_SIZE}`,
  })
  pageSize: number = DEFAULT_PAGE_SIZE;
}
