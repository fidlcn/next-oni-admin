import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

/**
 * 健康检查控制器 —— 供 Nginx / 监控系统探活使用
 * 返回 /health 端点，Nginx upstream 可配置 health_check 指向这里
 */
@Controller('health')
export class HealthController {
  constructor(private health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([]);
  }
}
