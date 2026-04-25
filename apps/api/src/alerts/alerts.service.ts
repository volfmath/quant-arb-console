import { Injectable, NotFoundException } from '@nestjs/common';

export type AlertRecord = {
  id: string;
  source: 'risk_engine' | 'execution_engine' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  title: string;
  message: string;
  created_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
};

@Injectable()
export class AlertsService {
  private readonly alerts: AlertRecord[] = [
    {
      id: 'mock-alert-api-health',
      source: 'system',
      severity: 'low',
      status: 'active',
      title: 'Mock 环境运行中',
      message: '当前系统使用 mock exchange，不会触发真实下单。',
      created_at: new Date().toISOString(),
    },
  ];

  list() {
    return {
      items: [...this.alerts],
      total: this.alerts.length,
      page: 1,
      size: this.alerts.length,
    };
  }

  unreadCount() {
    return {
      count: this.alerts.filter((alert) => alert.status === 'active').length,
    };
  }

  acknowledge(id: string): AlertRecord {
    const alert = this.find(id);
    alert.status = 'acknowledged';
    alert.acknowledged_at = new Date().toISOString();
    return alert;
  }

  dismiss(id: string): AlertRecord {
    const alert = this.find(id);
    alert.status = 'dismissed';
    alert.resolved_at = new Date().toISOString();
    return alert;
  }

  private find(id: string): AlertRecord {
    const alert = this.alerts.find((item) => item.id === id);
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    return alert;
  }
}

