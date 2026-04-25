import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Tag, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getTasks, type ArbitrageTask } from '../api/client';
import { useAuthStore } from '../auth/auth-store';

const columns: ColumnsType<ArbitrageTask> = [
  { title: '任务', dataIndex: 'task_number', key: 'task_number', render: (value: number) => `#${value}` },
  { title: '币种', dataIndex: 'unified_symbol', key: 'unified_symbol' },
  { title: '多方所', dataIndex: 'long_exchange', key: 'long_exchange' },
  { title: '空方所', dataIndex: 'short_exchange', key: 'short_exchange' },
  { title: '杠杆', dataIndex: 'leverage', key: 'leverage', render: (value: number) => `${value}x` },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (value: string) => <Tag color="blue">{value}</Tag>,
  },
  {
    title: '目标仓位',
    dataIndex: 'target_position_size',
    key: 'target_position_size',
    render: (value: number) => `$${value.toFixed(2)}`,
  },
  {
    title: '净收益',
    dataIndex: 'net_pnl',
    key: 'net_pnl',
    render: (value: number) => <span className={value >= 0 ? 'profit-text' : 'loss-text'}>${value.toFixed(4)}</span>,
  },
];

export function TasksPage() {
  const token = useAuthStore((state) => state.token);
  const query = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(token ?? ''),
    enabled: Boolean(token),
  });

  return (
    <section>
      <div className="page-header page-header-row">
        <div>
          <p className="eyebrow">Execution Control</p>
          <h1>套利任务</h1>
        </div>
        <Button onClick={() => void query.refetch()} loading={query.isFetching}>
          刷新
        </Button>
      </div>

      {query.error ? <Alert type="error" message="任务列表加载失败" showIcon /> : null}

      <section className="kpi-grid compact" aria-label="task summary">
        <KpiMini title="任务数" value={String(query.data?.total ?? 0)} />
        <KpiMini title="运行中" value="0" />
        <KpiMini title="待执行" value={String(query.data?.items.filter((task) => task.status === 'pending').length ?? 0)} />
      </section>

      <Table<ArbitrageTask>
        rowKey="id"
        className="data-table"
        loading={query.isLoading}
        columns={columns}
        dataSource={query.data?.items ?? []}
        pagination={false}
        size="middle"
      />
    </section>
  );
}

function KpiMini({ title, value }: { title: string; value: string }) {
  return (
    <div className="kpi-card mini">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

