import { Body, Controller, Get, Inject, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { CreateStrategyBody, StrategiesService, UpdateStrategyBody } from './strategies.service';

@Controller('strategies')
@UseGuards(JwtAuthGuard)
export class StrategiesController {
  constructor(@Inject(StrategiesService) private readonly strategiesService: StrategiesService) {}

  @Get()
  @RequirePermission('strategy:view')
  list() {
    return this.strategiesService.list();
  }

  @Get(':id')
  @RequirePermission('strategy:view')
  get(@Param('id') id: string) {
    return this.strategiesService.get(id);
  }

  @Post()
  @RequirePermission('strategy:edit')
  create(@Body() body: CreateStrategyBody) {
    return this.strategiesService.create(body);
  }

  @Put(':id')
  @RequirePermission('strategy:edit')
  update(@Param('id') id: string, @Body() body: UpdateStrategyBody) {
    return this.strategiesService.update(id, body);
  }

  @Put(':id/toggle')
  @RequirePermission('strategy:toggle')
  toggle(@Param('id') id: string) {
    return this.strategiesService.toggle(id);
  }
}
