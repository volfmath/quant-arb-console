import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Progress, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  createTaskFromOpportunity,
  executeTask,
  getOpportunities,
  type Opportunity,
} from '../api/client';
import { useAuthStore } from '../auth/auth-store';

export function OpportunitiesPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => getOpportunities(token ?? ''),
    enabled: Boolean(token),
  });
  const createTaskMutation = useMutation({
    mutationFn: async (opportunity: Opportunity) => {
      const task = await createTaskFromOpportunity(token ?? '', opportunity);
      return executeTask(token ?? '', task.id);
    },
    onSuccess: async () => {
      message.success('套利任务已创建并进入 mock 执行');
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => {
      message.error('套利任务创建失败');
    },
  });

  const columns: ColumnsType<Opportunity> = [
    { title: '币种', dataIndex: 'symbol_display', key: 'symbol_display', width: 100 },
    { title: '多方所', dataIndex: 'long_exchange', key: 'long_exchange', width: 110 },
    { title: '空方所', dataIndex: 'short_exchange', key: 'short_exchange', width: 110 },
    {
      title: '费率差',
      dataIndex: 'spread_8h_pct',
      key: 'spread_8h_pct',
      render: (value: number) => <span className="profit-text">{value.toFixed(4)}%</span>,
    },
    {
      title: '年化',
      dataIndex: 'annualized_return',
      key: 'annualized_return',
      render: (value: number) => <span className="profit-text">{value.toFixed(2)}%</span>,
    },
    {
      title: '评分',
      dataIndex: 'feasibility_score',
      key: 'feasibility_score',
      render: (value: number) => <Progress percent={value} size="small" />,
    },
    {
      title: '预估 8h',
      dataIndex: 'estimated_pnl_8h',
      key: 'estimated_pnl_8h',
      render: (value: number) => `$${value.toFixed(4)}`,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, row) => (
        <Button
          type="primary"
          size="small"
          loading={createTaskMutation.isPending}
          onClick={() => createTaskMutation.mutate(row)}
        >
          创建任务
        </Button>
      ),
    },
  ];

  return (
    <section>
      <div className="page-header page-header-row">
        <div>
          <p className="eyebrow">Funding Rate Arbitrage</p>
          <h1>套利机会</h1>
        </div>
        <Button onClick={() => void query.refetch()} loading={query.isFetching}>
          刷新
        </Button>
      </div>

      {query.error ? <Alert type="error" message="机会列表加载失败" showIcon /> : null}

      <section className="kpi-grid compact" aria-label="opportunity summary">
        <KpiMini title="机会数" value={String(query.data?.total ?? 0)} />
        <KpiMini title="监控模式" value="mock" />
        <KpiMini title="刷新" value={query.isFetching ? 'loading' : 'ready'} />
      </section>

      <Table<Opportunity>
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
