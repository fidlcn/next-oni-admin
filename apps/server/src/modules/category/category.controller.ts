import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/permissions.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  /** 公开：获取分类列表（博客侧边栏用） */
  @Get('public')
  @Public()
  findPublic(@Query('type') type?: string) {
    return this.categoryService.findAll(type);
  }

  /** 获取平铺列表 */
  @Get()
  findAll(@Query('type') type?: string) {
    return this.categoryService.findAll(type);
  }

  /** 获取树形结构 */
  @Get('tree')
  findTree(@Query('type') type?: string) {
    return this.categoryService.findTree(type);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: any) {
    return this.categoryService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.categoryService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id);
  }
}
