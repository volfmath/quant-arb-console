import { Controller, Get, Inject, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { AlertsService } from './alerts.service';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(@Inject(AlertsService) private readonly alertsService: AlertsService) {}

  @Get()
  @RequirePermission('alert:view')
  list() {
    return this.alertsService.list();
  }

  @Get('unread-count')
  @RequirePermission('alert:view')
  unreadCount() {
    return this.alertsService.unreadCount();
  }

  @Put(':id/acknowledge')
  @RequirePermission('alert:acknowledge')
  acknowledge(@Param('id') id: string) {
    return this.alertsService.acknowledge(id);
  }

  @Put(':id/dismiss')
  @RequirePermission('alert:dismiss')
  dismiss(@Param('id') id: string) {
    return this.alertsService.dismiss(id);
  }
}
