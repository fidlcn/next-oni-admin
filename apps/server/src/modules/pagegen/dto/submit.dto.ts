import {
  IsString,
  IsArray,
  ArrayMinSize,
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
 * 标签/风格必须在预设集合内，长度限制与常量保持一致
 */
export class SubmitPagegenDto {
  @IsString()
  @Length(1, PAGEGEN_TITLE_MAX, {
    message: `标题长度 1-${PAGEGEN_TITLE_MAX} 字`,
  })
  title: string;

  @IsArray()
  @ArrayMinSize(1, { message: '至少选择 1 个标签' })
  @ArrayMaxSize(PAGEGEN_MAX_TAGS, {
    message: `最多选择 ${PAGEGEN_MAX_TAGS} 个标签`,
  })
  @IsIn(PAGEGEN_TAG_VALUES, { each: true, message: '包含未知的标签' })
  tags: string[];

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
