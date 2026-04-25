import { Controller, Get, Inject, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { type ListOptions, OpportunitiesService } from './opportunities.service';

type OpportunityQuery = {
  symbol?: string | string[];
  min_score?: string;
  min_spread?: string;
  sort_by?: string;
  sort_direction?: string;
  page?: string;
  size?: string;
};

@Controller('opportunities')
@UseGuards(JwtAuthGuard)
@RequirePermission('opportunity:view')
export class OpportunitiesController {
  constructor(@Inject(OpportunitiesService) private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  async list(@Query() query: OpportunityQuery) {
    return this.opportunitiesService.list(buildListOptions(query));
  }

  @Get('summary')
  async summary() {
    return this.opportunitiesService.summary();
  }

  @Post('scan')
  async scan(@Query() query: OpportunityQuery) {
    return this.opportunitiesService.scanAndPublish(buildListOptions(query));
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    return this.opportunitiesService.detail(id);
  }
}

function buildListOptions(query: OpportunityQuery): ListOptions {
  return {
    symbols: parseSymbols(query.symbol),
    minScore: parseNumber(query.min_score),
    minSpread: parseNumber(query.min_spread),
    sortBy: parseSortBy(query.sort_by),
    sortDirection: parseSortDirection(query.sort_direction),
    page: parseNumber(query.page),
    size: parseNumber(query.size),
  };
}

function parseSymbols(symbol?: string | string[]): string[] | undefined {
  const values = Array.isArray(symbol) ? symbol : symbol ? [symbol] : [];
  const symbols = values.flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);

  return symbols.length ? symbols : undefined;
}

function parseNumber(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseSortBy(value?: string): ListOptions['sortBy'] {
  if (
    value === 'score' ||
    value === 'spread' ||
    value === 'annualized_return' ||
    value === 'estimated_pnl'
  ) {
    return value;
  }

  return undefined;
}

function parseSortDirection(value?: string): ListOptions['sortDirection'] {
  return value === 'asc' || value === 'desc' ? value : undefined;
}
