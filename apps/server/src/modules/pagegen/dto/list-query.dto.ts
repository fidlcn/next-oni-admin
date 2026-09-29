import { IsOptional, IsString, IsIn } from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';

/** 管理端列表查询 DTO */
export class AdminListPagegenDto extends PaginationDto {
  @IsOptional()
  @IsIn(['pending', 'generating', 'done', 'failed'], { message: '未知的状态' })
  status?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}

/** 公开目录列表查询 DTO（仅返回 done 页面的安全字段） */
export class PublicListPagegenDto extends PaginationDto {
  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsIn(['latest', 'hot'], { message: '排序仅支持 latest/hot' })
  sort?: 'latest' | 'hot';
}
