import { Body, Controller, Get, Inject, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { AuthService } from './auth.service';
import { JwtAuthGuard, type AuthenticatedRequest } from './jwt-auth.guard';

type LoginBody = {
  username?: string;
  password?: string;
};

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService)
    private readonly authService: AuthService,
    @Inject(AuditService)
    private readonly auditService: AuditService,
  ) {}

  @Post('login')
  async login(@Body() body: LoginBody) {
    if (!body.username || !body.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const response = await this.authService.login(body.username, body.password);
    this.auditService.record({
      userId: response.user.id,
      action: 'auth:login',
      resourceType: 'user',
      resourceId: response.user.id,
      afterState: { username: response.user.username, role: response.user.role },
    });

    return response;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @RequirePermission('dashboard:view')
  me(@Req() request: AuthenticatedRequest) {
    return { user: request.user };
  }
}
