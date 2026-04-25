import { Controller, Get, Header, Inject, UseGuards } from '@nestjs/common';
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

  @Get('by-strategy')
  byStrategy() {
    return this.pnlService.byStrategy();
  }

  @Get('by-exchange')
  byExchange() {
    return this.pnlService.byExchange();
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="pnl.csv"')
  exportCsv() {
    return this.pnlService.exportCsv();
  }
}
