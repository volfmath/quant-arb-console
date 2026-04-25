import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TasksModule } from '../tasks/tasks.module';
import { PnlController } from './pnl.controller';
import { PnlService } from './pnl.service';

@Module({
  imports: [AuthModule, TasksModule],
  controllers: [PnlController],
  providers: [PnlService],
  exports: [PnlService],
})
export class PnlModule {}

