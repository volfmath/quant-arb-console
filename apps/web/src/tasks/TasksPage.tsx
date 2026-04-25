import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Tag, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import {
  getTaskOrders,
  getTaskPositions,
  getTasks,
  type ArbitrageTask,
  type TaskOrder,
  type TaskPosition,
} from '../api/client';
import { useAuthStore } from '../auth/auth-store';

function createTaskColumns(onSelect: (task: ArbitrageTask) => void): ColumnsType<ArbitrageTask> {
  return [
    { title: '任务', dataIndex: 'task_number', key: 'task_number', render: (value: number) => `#${value}` },
    { title: '币种', dataIndex: 'unified_symbol', key: 'unified_symbol' },
    { title: '多方所', dataIndex: 'long_exchange', key: 'long_exchange' },
    { title: '空方所', dataIndex: 'short_exchange', key: 'short_exchange' },
    { title: '杠杆', dataIndex: 'leverage', key: 'leverage', render: (value: number) => `${value}x` },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => <Tag color={value === 'running' ? 'green' : 'blue'}>{value}</Tag>,
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
    {
      title: '操作',
      key: 'action',
      render: (_, row) => (
        <Button size="small" onClick={() => onSelect(row)}>
          查看
        </Button>
      ),
    },
  ];
}

const orderColumns: ColumnsType<TaskOrder> = [
  { title: '交易所', dataIndex: 'exchange', key: 'exchange' },
  { title: '方向', dataIndex: 'side', key: 'side' },
  { title: '腿', dataIndex: 'leg', key: 'leg' },
  { title: '数量', dataIndex: 'qty', key: 'qty', render: (value: number) => value.toFixed(8) },
  { title: '均价', dataIndex: 'avg_fill_price', key: 'avg_fill_price', render: (value: number) => value.toFixed(2) },
  { title: '状态', dataIndex: 'status', key: 'status', render: (value: string) => <Tag color="green">{value}</Tag> },
];

const positionColumns: ColumnsType<TaskPosition> = [
  { title: '交易所', dataIndex: 'exchange', key: 'exchange' },
  { title: '方向', dataIndex: 'side', key: 'side' },
  { title: '数量', dataIndex: 'qty', key: 'qty', render: (value: number) => value.toFixed(8) },
  { title: '入场价', dataIndex: 'avg_entry_price', key: 'avg_entry_price', render: (value: number) => value.toFixed(2) },
  { title: '保证金', dataIndex: 'margin', key: 'margin', render: (value: number) => `$${value.toFixed(4)}` },
  { title: '未实现', dataIndex: 'unrealized_pnl', key: 'unrealized_pnl', render: (value: number) => `$${value.toFixed(4)}` },
];

export function TasksPage() {
  const token = useAuthStore((state) => state.token);
  const [selectedTask, setSelectedTask] = useState<ArbitrageTask | null>(null);
  const query = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks(token ?? ''),
    enabled: Boolean(token),
  });
  const ordersQuery = useQuery({
    queryKey: ['task-orders', selectedTask?.id],
    queryFn: () => getTaskOrders(token ?? '', selectedTask!.id),
    enabled: Boolean(token && selectedTask),
  });
  const positionsQuery = useQuery({
    queryKey: ['task-positions', selectedTask?.id],
    queryFn: () => getTaskPositions(token ?? '', selectedTask!.id),
    enabled: Boolean(token && selectedTask),
  });
  const columns = createTaskColumns(setSelectedTask);

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
        <KpiMini title="运行中" value={String(query.data?.items.filter((task) => task.status === 'running').length ?? 0)} />
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

      {selectedTask ? (
        <section className="detail-grid" aria-label="task detail">
          <div>
            <h2>关联订单 #{selectedTask.task_number}</h2>
            <Table<TaskOrder>
              rowKey="id"
              className="data-table"
              loading={ordersQuery.isLoading}
              columns={orderColumns}
              dataSource={ordersQuery.data?.items ?? []}
              pagination={false}
              size="small"
            />
          </div>
          <div>
            <h2>关联持仓 #{selectedTask.task_number}</h2>
            <Table<TaskPosition>
              rowKey="id"
              className="data-table"
              loading={positionsQuery.isLoading}
              columns={positionColumns}
              dataSource={positionsQuery.data?.items ?? []}
              pagination={false}
              size="small"
            />
          </div>
        </section>
      ) : null}
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
