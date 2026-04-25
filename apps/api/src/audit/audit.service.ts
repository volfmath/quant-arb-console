import { Injectable } from '@nestjs/common';

export type AuditRecord = {
  id: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  beforeState?: unknown;
  afterState?: unknown;
  createdAt: Date;
};

export type AuditInput = Omit<AuditRecord, 'id' | 'createdAt'>;

@Injectable()
export class AuditService {
  private readonly records: AuditRecord[] = [];

  record(input: AuditInput): AuditRecord {
    const record: AuditRecord = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date(),
    };

    this.records.push(record);
    return record;
  }

  list(): AuditRecord[] {
    return [...this.records];
  }

  clear(): void {
    this.records.length = 0;
  }
}

