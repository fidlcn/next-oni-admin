import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  MaxLength,
  ValidateIf,
} from 'class-validator';

import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  PAGEGEN_TOKEN_TYPE,
  PAGEGEN_TOKEN_STATUS,
  PAGEGEN_HOURLY_LIMIT_MIN,
  PAGEGEN_HOURLY_LIMIT_MAX,
  PAGEGEN_MAX_USES_MIN,
  PAGEGEN_MAX_USES_MAX,
  PAGEGEN_TOKEN_BATCH_MAX,
} from '../pagegen.constants';

/**
 * 创建口令 DTO —— 按类型二选一携带限制参数
 * long（长期）：hourlyLimit 必填；short（短期）：maxUses 必填
 */
export class CreatePagegenTokenDto {
  @IsString()
  @MaxLength(100, { message: '备注名最长 100 字' })
  name: string;

  @IsIn(['long', 'short'], { message: '类型仅支持 long/short' })
  type: (typeof PAGEGEN_TOKEN_TYPE)[keyof typeof PAGEGEN_TOKEN_TYPE];

  @ValidateIf((o) => o.type === 'long')
  @IsInt({ message: '每小时条数必须是整数' })
  @Min(PAGEGEN_HOURLY_LIMIT_MIN, {
    message: `每小时条数最少 ${PAGEGEN_HOURLY_LIMIT_MIN}`,
  })
  @Max(PAGEGEN_HOURLY_LIMIT_MAX, {
    message: `每小时条数最多 ${PAGEGEN_HOURLY_LIMIT_MAX}`,
  })
  hourlyLimit?: number;

  @ValidateIf((o) => o.type === 'short')
  @IsInt({ message: '总条数必须是整数' })
  @Min(PAGEGEN_MAX_USES_MIN, {
    message: `总条数最少 ${PAGEGEN_MAX_USES_MIN}`,
  })
  @Max(PAGEGEN_MAX_USES_MAX, {
    message: `总条数最多 ${PAGEGEN_MAX_USES_MAX}`,
  })
  maxUses?: number;

  /** 批量个数（默认 1） */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(PAGEGEN_TOKEN_BATCH_MAX, {
    message: `单次最多生成 ${PAGEGEN_TOKEN_BATCH_MAX} 个口令`,
  })
  count?: number;
}

/** 更新口令 DTO（改名 / 启停） */
export class UpdatePagegenTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '备注名最长 100 字' })
  name?: string;

  @IsOptional()
  @IsIn([PAGEGEN_TOKEN_STATUS.ACTIVE, PAGEGEN_TOKEN_STATUS.DISABLED], {
    message: '状态仅支持 active/disabled',
  })
  status?: 'active' | 'disabled';
}

/** 口令列表查询 DTO */
export class AdminListPagegenTokenDto extends PaginationDto {
  @IsOptional()
  @IsIn(['long', 'short'], { message: '类型仅支持 long/short' })
  type?: string;

  @IsOptional()
  @IsIn(['active', 'disabled'], { message: '状态仅支持 active/disabled' })
  status?: string;
}
