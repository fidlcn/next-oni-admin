import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  MediaService,
  isAllowedMediaName,
  MEDIA_MAX_BYTES,
} from './media.service';
import { QueryMediaDto } from './dto/query-media.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * 媒体管理控制器 —— 文件上传和管理
 * 上传限制：单文件最大 10MB；扩展名白名单（图片/视频/PDF，SVG 因存储型 XSS 风险拒绝），
 * 叠加服务端魔数校验（见 MediaService.upload）
 */
@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MEDIA_MAX_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!isAllowedMediaName(file.originalname, file.mimetype)) {
          cb(
            new BadRequestException(
              '不支持的文件类型（仅限图片/视频/PDF，不允许 SVG）',
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('请选择文件');
    }
    return this.mediaService.upload(file, req.user.id);
  }

  @Get()
  findAll(@Query() dto: QueryMediaDto) {
    return this.mediaService.findAll(dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.mediaService.remove(id);
  }
}
