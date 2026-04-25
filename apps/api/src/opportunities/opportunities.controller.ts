import { Controller, Get, Inject, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { OpportunitiesService } from './opportunities.service';

@Controller('opportunities')
@UseGuards(JwtAuthGuard)
@RequirePermission('opportunity:view')
export class OpportunitiesController {
  constructor(@Inject(OpportunitiesService) private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  async list(@Query('symbol') symbol?: string, @Query('min_score') minScore?: string) {
    return this.opportunitiesService.list({
      symbols: symbol ? [`${symbol.toUpperCase()}/USDT:USDT`] : undefined,
      minScore: minScore ? Number(minScore) : undefined,
    });
  }

  @Get('summary')
  async summary() {
    return this.opportunitiesService.summary();
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.opportunitiesService.detail(id);
  }
}
