import { ReloadOutlined, SearchOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Input, InputNumber, Modal, Progress, Select, Space, Spin, Table, Tabs, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import {
  createTaskFromOpportunity,
  executeTask,
  getOpportunityAudit,
  getOpportunityDetail,
  getOpportunitySummary,
  getOpportunities,
  type Opportunity,
  type OpportunityDetail,
  type OpportunityQueryParams,
  type OpportunityScanAudit,
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

type TaskDraft = {
  opportunity: Opportunity;
  leverage: number;
  targetPositionSize: number;
};

export function OpportunitiesPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<OpportunityQueryParams>(defaultFilters);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDraft | null>(null);
  const query = useQuery({
    queryKey: ['opportunities', filters],
    queryFn: () => getOpportunities(token ?? '', filters),
    enabled: Boolean(token),
  });
  const summaryQuery = useQuery({
    queryKey: ['opportunities', 'summary'],
    queryFn: () => getOpportunitySummary(token ?? ''),
    enabled: Boolean(token),
  });
  const auditQuery = useQuery({
    queryKey: ['opportunities', 'audit'],
    queryFn: () => getOpportunityAudit(token ?? ''),
    enabled: Boolean(token),
  });
  const detailQuery = useQuery({
    queryKey: ['opportunity-detail', selectedOpportunity?.id],
    queryFn: () => getOpportunityDetail(token ?? '', selectedOpportunity!.id),
    enabled: Boolean(token && selectedOpportunity),
  });
  const scanMutation = useMutation({
    mutationFn: () => scanOpportunities(token ?? '', filters),
    onSuccess: async () => {
      message.success('机会扫描已完成');
      await queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      await auditQuery.refetch();
    },
    onError: () => {
      message.error('机会扫描失败');
    },
  });
  const createTaskMutation = useMutation({
    mutationFn: async (draft: TaskDraft) => {
      const task = await createTaskFromOpportunity(token ?? '', draft.opportunity, {
        leverage: draft.leverage,
        targetPositionSize: draft.targetPositionSize,
      });
      return executeTask(token ?? '', task.id);
    },
    onSuccess: async () => {
      message.success('套利任务已创建并进入 mock 执行');
      setTaskDraft(null);
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
        <Space>
          <Button
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              setSelectedOpportunity(row);
            }}
          >
            查看
          </Button>
          <Button
            type="primary"
            size="small"
            loading={createTaskMutation.isPending}
            onClick={(event) => {
              event.stopPropagation();
              setTaskDraft({ opportunity: row, leverage: 3, targetPositionSize: 200 });
            }}
          >
            创建任务
          </Button>
        </Space>
      ),
    },
  ];

  const auditColumns: ColumnsType<OpportunityScanAudit> = [
    {
      title: '时间',
      dataIndex: 'scanned_at',
      key: 'scanned_at',
      render: (value: string) => new Date(value).toLocaleString(),
    },
    {
      title: '来源',
      dataIndex: 'source',
      key: 'source',
      render: (value: OpportunityScanAudit['source']) => (
        <Tag color={value === 'manual_scan' ? 'blue' : 'default'}>{value}</Tag>
      ),
    },
    { title: '监控币种', dataIndex: 'monitored_symbols', key: 'monitored_symbols' },
    { title: '可比较币种', dataIndex: 'comparable_symbols', key: 'comparable_symbols' },
    { title: '行情快照', dataIndex: 'funding_snapshots', key: 'funding_snapshots' },
    {
      title: '数据源',
      dataIndex: 'data_sources',
      key: 'data_sources',
      render: (sources: string[]) => (
        <Space size={[4, 4]} wrap>
          {sources.map((source) => (
            <Tag key={source}>{source}</Tag>
          ))}
        </Space>
      ),
    },
    { title: '机会数', dataIndex: 'opportunity_count', key: 'opportunity_count' },
    {
      title: '最佳机会',
      dataIndex: 'best_opportunity',
      key: 'best_opportunity',
      render: (value: OpportunityScanAudit['best_opportunity']) =>
        value ? `${value.symbol}: ${value.long_exchange} long / ${value.short_exchange} short` : '-',
    },
    {
      title: '币种覆盖',
      dataIndex: 'symbols',
      key: 'symbols',
      render: (symbols: OpportunityScanAudit['symbols']) => {
        const comparable = symbols.filter((symbol) => symbol.comparable).length;
        return `${comparable}/${symbols.length}`;
      },
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
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              void query.refetch();
              void auditQuery.refetch();
            }}
            loading={query.isFetching || auditQuery.isFetching}
          >
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
          placeholder="BTC / ETH / SOL / XRP / DOGE"
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

      <Tabs
        className="opportunity-tabs"
        onChange={(key) => {
          if (key === 'audit') {
            void auditQuery.refetch();
          }
        }}
        items={[
          {
            key: 'funding',
            label: '资金费率套利',
            children: (
              <>
                <section className="kpi-grid compact" aria-label="opportunity summary">
                  <KpiMini title="机会数" value={String(summaryQuery.data?.total_count ?? query.data?.total ?? 0)} />
                  <KpiMini title="最佳机会" value={summaryQuery.data?.best_opportunity?.symbol ?? '-'} />
                  <KpiMini title="平均费率差" value={`${(summaryQuery.data?.avg_spread_8h ?? 0).toFixed(4)}%`} />
                  <KpiMini title="监控币种" value={String(summaryQuery.data?.monitored_symbols ?? 0)} />
                  <KpiMini title="交易所" value={String(summaryQuery.data?.monitored_exchanges ?? 0)} />
                  <KpiMini title="结算倒计时" value={summaryQuery.data?.next_settlement_countdown ?? '-'} />
                  <KpiMini title="刷新" value={query.isFetching ? 'loading' : 'ready'} />
                </section>

                <section className={selectedOpportunity ? 'opportunity-workbench has-detail' : 'opportunity-workbench'}>
                  <Table<Opportunity>
                    rowKey="id"
                    className="data-table"
                    loading={query.isLoading}
                    columns={columns}
                    dataSource={query.data?.items ?? []}
                    onRow={(row) => ({
                      onClick: () => setSelectedOpportunity(row),
                    })}
                    pagination={{
                      current: query.data?.page ?? filters.page,
                      pageSize: query.data?.size ?? filters.size,
                      total: query.data?.total ?? 0,
                      showSizeChanger: true,
                      onChange: (page, size) => setFilters((current) => ({ ...current, page, size })),
                    }}
                    size="middle"
                  />

                  {selectedOpportunity ? (
                    <OpportunityDetailPanel
                      opportunity={selectedOpportunity}
                      detail={detailQuery.data}
                      loading={detailQuery.isLoading}
                      error={Boolean(detailQuery.error)}
                      onCreateTask={(opportunity) => setTaskDraft({ opportunity, leverage: 3, targetPositionSize: 200 })}
                    />
                  ) : null}
                </section>
              </>
            ),
          },
          {
            key: 'spread',
            label: '价差套利',
            disabled: true,
            children: null,
          },
          {
            key: 'audit',
            label: '扫描审计',
            children: (
              <Table<OpportunityScanAudit>
                rowKey="id"
                className="data-table"
                loading={auditQuery.isLoading}
                columns={auditColumns}
                dataSource={auditQuery.data?.items ?? []}
                pagination={false}
                size="middle"
                locale={{
                  emptyText: scanMutation.isPending
                    ? '扫描中，审计记录生成后会显示在这里'
                    : '暂无扫描审计记录，请先点击右上角“扫描”',
                }}
              />
            ),
          },
        ]}
      />

      <Modal
        title="创建套利任务"
        open={Boolean(taskDraft)}
        okText="创建并执行"
        cancelText="取消"
        confirmLoading={createTaskMutation.isPending}
        onCancel={() => setTaskDraft(null)}
        onOk={() => {
          if (taskDraft) {
            createTaskMutation.mutate(taskDraft);
          }
        }}
      >
        {taskDraft ? (
          <div className="task-modal-form">
            <Metric label="交易对" value={taskDraft.opportunity.unified_symbol} />
            <Metric
              label="方向"
              value={`${taskDraft.opportunity.long_exchange} long / ${taskDraft.opportunity.short_exchange} short`}
            />
            <InputNumber
              min={1}
              max={10}
              value={taskDraft.leverage}
              addonBefore="杠杆"
              addonAfter="x"
              onChange={(value) =>
                setTaskDraft((current) => (current ? { ...current, leverage: typeof value === 'number' ? value : 1 } : current))
              }
            />
            <InputNumber
              min={50}
              step={50}
              value={taskDraft.targetPositionSize}
              addonBefore="目标仓位"
              addonAfter="USDT"
              onChange={(value) =>
                setTaskDraft((current) =>
                  current ? { ...current, targetPositionSize: typeof value === 'number' ? value : 50 } : current,
                )
              }
            />
          </div>
        ) : null}
      </Modal>
    </section>
  );
}

function OpportunityDetailPanel({
  opportunity,
  detail,
  loading,
  error,
  onCreateTask,
}: {
  opportunity: Opportunity;
  detail?: OpportunityDetail;
  loading: boolean;
  error: boolean;
  onCreateTask: (opportunity: Opportunity) => void;
}) {
  const data = detail ?? opportunity;

  return (
    <aside className="opportunity-detail-panel" aria-label="opportunity detail">
      <div className="panel-heading">
        <div>
          <span>Opportunity Detail</span>
          <h2>{data.unified_symbol}</h2>
        </div>
        <Space>
          <Tag color="blue">{data.feasibility_score}</Tag>
          <Button size="small" type="primary" onClick={() => onCreateTask(opportunity)}>
            创建任务
          </Button>
        </Space>
      </div>

      {error ? <Alert type="error" message="机会详情加载失败" showIcon /> : null}
      {loading ? <Spin /> : null}

      <div className="detail-metrics">
        <Metric label="多方交易所" value={data.long_exchange} />
        <Metric label="空方交易所" value={data.short_exchange} />
        <Metric label="8h 费率差" value={`${data.spread_8h_pct.toFixed(4)}%`} accent />
        <Metric label="年化收益" value={`${data.annualized_return.toFixed(2)}%`} accent />
        <Metric label="预估 8h" value={formatMoney(data.estimated_pnl_8h)} accent />
        <Metric label="预估 24h" value={formatMoney(detail?.estimated_pnl_24h)} accent />
        <Metric label="预估 7d" value={formatMoney(detail?.estimated_pnl_7d)} accent />
        <Metric label="手续费估算" value={formatMoney(detail?.fee_estimate)} />
        <Metric label="滑点估算" value={formatMoney(detail?.slippage_estimate)} />
        <Metric label="结算倒计时" value={data.settlement_countdown} />
      </div>
    </aside>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong className={accent ? 'profit-text' : undefined}>{value}</strong>
    </div>
  );
}

function formatMoney(value: number | undefined): string {
  return `$${(value ?? 0).toFixed(4)}`;
}

function KpiMini({ title, value }: { title: string; value: string }) {
  return (
    <div className="kpi-card mini">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
