import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { CreateTaskBody, TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @RequirePermission('task:view')
  list() {
    return this.tasksService.list();
  }

  @Post()
  @RequirePermission('task:create')
  create(@Body() body: CreateTaskBody) {
    return this.tasksService.create(body);
  }

  @Post(':id/execute')
  @RequirePermission('task:create')
  execute(@Param('id') id: string) {
    return this.tasksService.execute(id);
  }

  @Get(':id/orders')
  @RequirePermission('task:view')
  orders(@Param('id') id: string) {
    return this.tasksService.orders(id);
  }

  @Get(':id/positions')
  @RequirePermission('task:view')
  positions(@Param('id') id: string) {
    return this.tasksService.positions(id);
  }
}
