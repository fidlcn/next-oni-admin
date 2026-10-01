import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

/** 用户列表查询 —— 用继承类而非交集类型，保证校验器生效 */
export class QueryUserDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  keyword?: string;
}
