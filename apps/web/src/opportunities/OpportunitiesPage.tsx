import { ReloadOutlined, SearchOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Input, InputNumber, Progress, Select, Space, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import {
  createTaskFromOpportunity,
  executeTask,
  getOpportunities,
  type Opportunity,
  type OpportunityQueryParams,
  scanOpportunities,
} from '../api/client';
import { useAuthStore } from '../auth/auth-store';

const defaultFilters: OpportunityQueryParams = {
  symbol: '',
  minSpread: 0.0001,
  sortBy: 'spread',
  sortDirection: 'desc',
  page: 1,
  size: 20,
};

export function OpportunitiesPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<OpportunityQueryParams>(defaultFilters);
  const query = useQuery({
    queryKey: ['opportunities', filters],
    queryFn: () => getOpportunities(token ?? '', filters),
    enabled: Boolean(token),
  });
  const scanMutation = useMutation({
    mutationFn: () => scanOpportunities(token ?? '', filters),
    onSuccess: async () => {
      message.success('机会扫描已完成');
      await queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
    onError: () => {
      message.error('机会扫描失败');
    },
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
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void query.refetch()} loading={query.isFetching}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={() => scanMutation.mutate()}
            loading={scanMutation.isPending}
          >
            扫描
          </Button>
        </Space>
      </div>

      {query.error ? <Alert type="error" message="机会列表加载失败" showIcon /> : null}

      <section className="filter-toolbar" aria-label="opportunity filters">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="BTC / ETHUSDT / SOL-USDT-SWAP"
          value={filters.symbol}
          onChange={(event) => setFilters((current) => ({ ...current, symbol: event.target.value, page: 1 }))}
        />
        <InputNumber
          min={0}
          step={0.00001}
          value={filters.minSpread}
          addonBefore="最小费率差"
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              minSpread: typeof value === 'number' ? value : undefined,
              page: 1,
            }))
          }
        />
        <InputNumber
          min={0}
          max={100}
          value={filters.minScore}
          addonBefore="最小评分"
          onChange={(value) =>
            setFilters((current) => ({
              ...current,
              minScore: typeof value === 'number' ? value : undefined,
              page: 1,
            }))
          }
        />
        <Select
          value={filters.sortBy}
          onChange={(value) => setFilters((current) => ({ ...current, sortBy: value, page: 1 }))}
          options={[
            { value: 'spread', label: '费率差排序' },
            { value: 'score', label: '评分排序' },
            { value: 'annualized_return', label: '年化排序' },
            { value: 'estimated_pnl', label: '预估收益排序' },
          ]}
        />
      </section>

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
        pagination={{
          current: query.data?.page ?? filters.page,
          pageSize: query.data?.size ?? filters.size,
          total: query.data?.total ?? 0,
          showSizeChanger: true,
          onChange: (page, size) => setFilters((current) => ({ ...current, page, size })),
        }}
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
