import { SetMetadata } from '@nestjs/common';

/**
 * 操作日志装饰器 —— 标记需要记录日志的接口
 * 参数为日志模块名和操作类型
 *
 * 用法：@Log('user', 'create')
 * 拦截器会自动提取操作者、IP、请求参数等信息写入数据库
 */
export const LOG_KEY = 'operation_log';

export const Log = (module: string, action: string) =>
  SetMetadata(LOG_KEY, { module, action });
