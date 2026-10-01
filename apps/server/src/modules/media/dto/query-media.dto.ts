import { IsOptional, IsIn, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/** 媒体列表查询 —— 交集类型（PaginationDto & {...}）没有校验器，必须用继承类 */
export class QueryMediaDto extends PaginationDto {
  @IsOptional()
  @IsIn(['image', 'video', 'file'])
  type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  keyword?: string;
}
