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
import { IsString, MinLength, MaxLength } from 'class-validator';

import { UserService } from './user.service';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from '../auth/dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/permissions.guard';

/** 管理员重置密码 —— 明文新密码经同源 https 通道传输，长度规则与注册一致 */
export class ResetPasswordDto {
  @IsString()
  @MinLength(8, { message: '密码至少 8 位' })
  @MaxLength(64)
  password: string;
}

/**
 * 用户管理控制器 —— 仅管理员可访问
 * 提供用户的增删改查和密码重置功能
 */
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  findAll(@Query() dto: QueryUserDto) {
    return this.userService.findAll(dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.userService.remove(id, req.user?.id);
  }

  @Put(':id/reset-password')
  resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.userService.resetPassword(id, dto.password);
  }
}
