import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

/**
 * 内容管理控制器 —— 管理后台的文章/页面 CRUD
 * 列表支持分页、关键词搜索、状态筛选、分类筛选
 * 公开接口（@Public）：博客列表和详情，无需认证
 */
@Controller('contents')
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private contentService: ContentService) {}

  /** 公开：获取已发布文章列表（博客首页用） */
  @Get('public')
  @Public()
  findPublic(
    @Query()
    dto: PaginationDto & {
      keyword?: string;
      categoryId?: number;
    },
  ) {
    // 只返回已发布的文章
    return this.contentService.findAll({ ...dto, status: 1 });
  }

  /** 公开：获取单篇已发布文章详情（博客详情用） */
  @Get('public/:id')
  @Public()
  findPublicOne(@Param('id', ParseIntPipe) id: number) {
    return this.contentService.findOne(id);
  }

  @Get()
  findAll(
    @Query()
    dto: PaginationDto & {
      keyword?: string;
      status?: number;
      categoryId?: number;
    },
  ) {
    return this.contentService.findAll(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contentService.findOne(id);
  }

  @Post()
  create(@Body() dto: any, @Req() req: any) {
    return this.contentService.create(dto, req.user.id);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.contentService.update(id, dto);
  }

  /** 批量更新状态 */
  @Put('batch/status')
  batchStatus(@Body() dto: { ids: number[]; status: number }) {
    return this.contentService.batchUpdateStatus(dto.ids, dto.status);
  }

  /** 批量删除 */
  @Delete('batch')
  batchRemove(@Body() dto: { ids: number[] }) {
    return this.contentService.batchRemove(dto.ids);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.contentService.remove(id);
  }
}
