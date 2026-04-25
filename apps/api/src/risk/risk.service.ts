import { Injectable } from '@nestjs/common';
import { getAppConfig } from '../config/app.config';

export type RiskCheckInput = {
  targetPositionSize: number;
  leverage: number;
  longAccountId: string;
  shortAccountId: string;
};

export type RiskCheckResult = {
  passed: boolean;
  reasons: string[];
};

@Injectable()
export class RiskService {
  checkBeforeOpen(input: RiskCheckInput): RiskCheckResult {
    const reasons: string[] = [];

    if (!Number.isFinite(input.targetPositionSize) || input.targetPositionSize <= 0) {
      reasons.push('target_position_size must be greater than 0');
    }

    if (!Number.isInteger(input.leverage) || input.leverage < 1 || input.leverage > 3) {
      reasons.push('leverage must be an integer between 1 and 3');
    }

    if (input.longAccountId === input.shortAccountId) {
      reasons.push('long and short accounts must be different');
    }

    const config = getAppConfig();
    if (config.exchangeMode === 'live' && !config.liveTradingEnabled) {
      reasons.push('live trading is disabled');
    }

    return {
      passed: reasons.length === 0,
      reasons,
    };
  }
}

