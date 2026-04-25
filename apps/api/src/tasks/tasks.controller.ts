import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
}

