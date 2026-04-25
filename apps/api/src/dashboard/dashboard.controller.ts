import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@RequirePermission('dashboard:view')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('asset-summary')
  assetSummary() {
    return this.dashboardService.assetSummary();
  }

  @Get('strategy-summary')
  strategySummary() {
    return this.dashboardService.strategySummary();
  }

  @Get('risk-summary')
  riskSummary() {
    return this.dashboardService.riskSummary();
  }
}

