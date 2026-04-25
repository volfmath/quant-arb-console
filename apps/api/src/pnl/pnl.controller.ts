import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { PnlService } from './pnl.service';

@Controller('analytics/pnl')
@UseGuards(JwtAuthGuard)
@RequirePermission('analytics:view')
export class PnlController {
  constructor(@Inject(PnlService) private readonly pnlService: PnlService) {}

  @Get('summary')
  summary() {
    return this.pnlService.summary();
  }

  @Get('trend')
  trend() {
    return this.pnlService.trend();
  }

  @Get('details')
  details() {
    return this.pnlService.details();
  }
}
