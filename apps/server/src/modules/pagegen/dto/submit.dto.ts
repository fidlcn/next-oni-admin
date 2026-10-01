import {
  IsString,
  IsArray,
  IsOptional,
  ArrayMaxSize,
  IsIn,
  Length,
  MaxLength,
} from 'class-validator';

import {
  PAGEGEN_TAGS,
  PAGEGEN_STYLES,
  PAGEGEN_TAG_VALUES,
  PAGEGEN_STYLE_VALUES,
  PAGEGEN_TITLE_MAX,
  PAGEGEN_CONTENT_MAX,
  PAGEGEN_MAX_TAGS,
} from '../pagegen.constants';

/**
 * 提交生成任务 DTO —— 公开接口（口令准入）
 * 表单精简后：标题、标签均为可选 —— 未提供时由 AI 决定
 * （标题自拟；标签由模型在元数据注释里从预设范围选择）
 */
export class SubmitPagegenDto {
  @IsOptional()
  @IsString()
  @MaxLength(PAGEGEN_TITLE_MAX, {
    message: `标题最长 ${PAGEGEN_TITLE_MAX} 字`,
  })
  title?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(PAGEGEN_MAX_TAGS, {
    message: `最多 ${PAGEGEN_MAX_TAGS} 个标签`,
  })
  @IsIn(PAGEGEN_TAG_VALUES, { each: true, message: '包含未知的标签' })
  tags?: string[];

  @IsIn(PAGEGEN_STYLE_VALUES, { message: '未知的风格' })
  style: string;

  @IsString()
  @Length(1, PAGEGEN_CONTENT_MAX, {
    message: `正文长度 1-${PAGEGEN_CONTENT_MAX} 字`,
  })
  content: string;

  @IsString()
  @MaxLength(128)
  accessCode: string;

  /** 提交设备 ID（前端 localStorage 持久化的 uuid，用于口令单设备独占） */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  deviceId?: string;
}

/** 供 Swagger 展示的选项说明（运行时校验以常量为准） */
export const PAGEGEN_TAG_OPTIONS = PAGEGEN_TAGS.map((t) => ({
  value: t.value,
  label: t.label,
}));
export const PAGEGEN_STYLE_OPTIONS = PAGEGEN_STYLES.map((s) => ({
  value: s.value,
  label: s.label,
}));
