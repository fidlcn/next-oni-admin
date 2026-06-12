import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';

import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/permissions.guard';

/**
 * 菜单控制器
 * GET /menus/tree —— 获取当前用户的动态菜单（登录后可用）
 * 其余接口仅管理员可用
 */
@Controller('menus')
export class MenuController {
  constructor(private menuService: MenuService) {}

  /** 获取当前用户的菜单树 —— 前端动态路由的数据源 */
  @Get('tree')
  @UseGuards(JwtAuthGuard)
  getMenuTree(@Req() req: any) {
    return this.menuService.getMenuTreeForUser(req.user);
  }

  /** 获取所有菜单（管理用） */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  findAll() {
    return this.menuService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: any) {
    return this.menuService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.menuService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.remove(id);
  }
}
