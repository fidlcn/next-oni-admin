import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Response } from 'express';

import { PagegenService } from './pagegen.service';
import { SubmitPagegenDto } from './dto/submit.dto';
import {
  AdminListPagegenDto,
  PublicListPagegenDto,
} from './dto/list-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

/**
 * 托管页生成控制器
 * 公开接口（@Public，口令/频控自管）：submit / status / public/list / public/view
 * 管理接口（JWT）：list / stats / export / delete
 */
@Controller('pagegen')
@UseGuards(JwtAuthGuard)
export class PagegenController {
  constructor(private pagegenService: PagegenService) {}

  /** 提交生成任务 —— 公开，口令准入 + 10 次/分钟（ThrottlerGuard 仅在此类公开写接口上局部启用） */
  @Post('submit')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  submit(@Body() dto: SubmitPagegenDto, @Req() req: any) {
    // nginx 设置 X-Real-IP；直连场景回退 req.ip
    const ip = (req.headers['x-real-ip'] as string) || req.ip || 'unknown';
    const userAgent = (req.headers['user-agent'] as string) || undefined;
    return this.pagegenService.submit(dto, ip, userAgent);
  }

  /** H5 轮询任务状态 —— 公开（pageId 不可猜测即访问控制） */
  @Get('status/:pageId')
  @Public()
  status(@Param('pageId') pageId: string) {
    return this.pagegenService.status(pageId);
  }

  /** 公开目录列表 —— 仅 done 页面的安全字段 */
  @Get('public/list')
  @Public()
  publicList(@Query() dto: PublicListPagegenDto) {
    return this.pagegenService.publicList(dto);
  }

  /** 浏览计数埋点 —— 公开，60 次/分钟防刷。
   *  用 GET 而非 POST：匿名访客没有 CSRF cookie，POST 会被 CSRF 中间件拦截；
   *  计数无害且幂等，配合限流足够（像素计数器的惯例做法） */
  @Get('public/view/:pageId')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ medium: { limit: 60, ttl: 60000 } })
  view(@Param('pageId') pageId: string) {
    return this.pagegenService.incrementViews(pageId);
  }

  /** 管理端列表 */
  @Get('list')
  list(@Query() dto: AdminListPagegenDto) {
    return this.pagegenService.adminList(dto);
  }

  /** 管理端统计卡片 */
  @Get('stats')
  stats() {
    return this.pagegenService.stats();
  }

  /** 管理端导出 CSV —— @Res 直写响应（绕过统一 JSON 包装） */
  @Get('export')
  async export(@Res() res: Response) {
    const csv = await this.pagegenService.exportCsv();
    res
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="hosted-pages.csv"',
      })
      .send(csv);
  }

  /** 删除托管页（文件 + 记录） */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pagegenService.remove(id);
  }
}
