import { Body, Controller, Get, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { CreateRiskRuleBody, RiskCircuitBreakBody, RiskService } from './risk.service';

@Controller('risk')
@UseGuards(JwtAuthGuard)
export class RiskController {
  constructor(@Inject(RiskService) private readonly riskService: RiskService) {}

  @Get('overview')
  @RequirePermission('risk:view')
  overview() {
    return this.riskService.overview();
  }

  @Get('rules')
  @RequirePermission('risk:view')
  rules() {
    return this.riskService.rulesList();
  }

  @Post('rules')
  @RequirePermission('risk:edit_rule')
  createRule(@Body() body: CreateRiskRuleBody) {
    return this.riskService.createRule(body);
  }

  @Put('rules/:id')
  @RequirePermission('risk:edit_rule')
  updateRule(@Param('id') id: string, @Body() body: CreateRiskRuleBody) {
    return this.riskService.updateRule(id, body);
  }

  @Put('rules/:id/toggle')
  @RequirePermission('risk:edit_rule')
  toggleRule(@Param('id') id: string) {
    return this.riskService.toggleRule(id);
  }

  @Get('accounts')
  @RequirePermission('risk:view')
  accounts() {
    return this.riskService.accounts();
  }

  @Post('circuit-break')
  @RequirePermission('risk:circuit_break')
  circuitBreak(@Body() body: RiskCircuitBreakBody) {
    return this.riskService.circuitBreak(body);
  }
}
