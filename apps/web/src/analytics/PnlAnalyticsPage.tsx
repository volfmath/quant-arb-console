import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Progress, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getPnlDetails, getPnlSummary, getPnlTrend, type PnlDetail, type PnlTrendPoint } from '../api/client';
import { useAuthStore } from '../auth/auth-store';

const detailColumns: ColumnsType<PnlDetail> = [
  { title: 'Task', dataIndex: 'task_number', key: 'task_number', render: (value: number) => `#${value}` },
  { title: 'Symbol', dataIndex: 'unified_symbol', key: 'unified_symbol' },
  {
    title: 'Route',
    key: 'route',
    render: (_, row) => `${row.long_exchange} / ${row.short_exchange}`,
  },
  {
    title: 'Funding',
    dataIndex: 'funding_income',
    key: 'funding_income',
    render: (value: number) => formatMoney(value, 4),
  },
  {
    title: 'Fee',
    dataIndex: 'fee_cost',
    key: 'fee_cost',
    render: (value: number) => formatMoney(value, 4),
  },
  {
    title: 'Net PnL',
    dataIndex: 'net_pnl',
    key: 'net_pnl',
    render: (value: number) => <span className={value >= 0 ? 'profit-text' : 'loss-text'}>{formatMoney(value, 4)}</span>,
  },
  {
    title: 'Snapshot',
    dataIndex: 'snapshot_at',
    key: 'snapshot_at',
    render: (value: string) => new Date(value).toLocaleString(),
  },
];

export function PnlAnalyticsPage() {
  const token = useAuthStore((state) => state.token);
  const summaryQuery = useQuery({
    queryKey: ['analytics', 'pnl', 'summary'],
    queryFn: () => getPnlSummary(token ?? ''),
    enabled: Boolean(token),
  });
  const trendQuery = useQuery({
    queryKey: ['analytics', 'pnl', 'trend'],
    queryFn: () => getPnlTrend(token ?? ''),
    enabled: Boolean(token),
  });
  const detailsQuery = useQuery({
    queryKey: ['analytics', 'pnl', 'details'],
    queryFn: () => getPnlDetails(token ?? ''),
    enabled: Boolean(token),
  });

  const loading = summaryQuery.isLoading || trendQuery.isLoading || detailsQuery.isLoading;
  const hasError = summaryQuery.error || trendQuery.error || detailsQuery.error;

  return (
    <section>
      <div className="page-header page-header-row">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>PnL Analytics</h1>
        </div>
        <Button
          onClick={() => {
            void summaryQuery.refetch();
            void trendQuery.refetch();
            void detailsQuery.refetch();
          }}
          loading={summaryQuery.isFetching || trendQuery.isFetching || detailsQuery.isFetching}
        >
          Refresh
        </Button>
      </div>

      {hasError ? <Alert type="error" message="PnL analytics load failed" showIcon /> : null}

      <section className="kpi-grid" aria-label="pnl summary">
        <Kpi title="Total PnL" value={formatMoney(summaryQuery.data?.total_pnl)} />
        <Kpi title="Funding Income" value={formatMoney(summaryQuery.data?.funding_income)} />
        <Kpi title="Trading Fees" value={formatMoney(summaryQuery.data?.fee_cost)} />
        <Kpi title="Unrealized PnL" value={formatMoney(summaryQuery.data?.unrealized_pnl)} />
      </section>

      <section className="analytics-grid">
        <div className="analytics-panel" aria-label="pnl trend">
          <div className="panel-heading">
            <h2>Task PnL Trend</h2>
            <span>{trendQuery.data?.points.length ?? 0} points</span>
          </div>
          <TrendBars points={trendQuery.data?.points ?? []} loading={loading} />
        </div>
        <div className="analytics-panel" aria-label="pnl mix">
          <div className="panel-heading">
            <h2>PnL Mix</h2>
            <span>Funding vs fee</span>
          </div>
          <MixBar funding={summaryQuery.data?.funding_income ?? 0} fee={summaryQuery.data?.fee_cost ?? 0} />
        </div>
      </section>

      <Table<PnlDetail>
        rowKey="task_id"
        className="data-table pnl-table"
        loading={detailsQuery.isLoading}
        columns={detailColumns}
        dataSource={detailsQuery.data?.items ?? []}
        pagination={false}
        size="middle"
      />
    </section>
  );
}

function Kpi({ title, value }: { title: string; value: string }) {
  return (
    <div className="kpi-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TrendBars({ points, loading }: { points: PnlTrendPoint[]; loading: boolean }) {
  if (loading) {
    return <div className="empty-state">Loading</div>;
  }

  if (points.length === 0) {
    return <div className="empty-state">No executed tasks</div>;
  }

  const maxAbs = Math.max(...points.map((point) => Math.abs(point.total)), 0.01);

  return (
    <div className="trend-bars">
      {points.slice(-8).map((point) => {
        const height = Math.max(8, (Math.abs(point.total) / maxAbs) * 120);
        return (
          <div className="trend-item" key={`${point.time}-${point.total}`}>
            <div
              className={point.total >= 0 ? 'trend-bar positive' : 'trend-bar negative'}
              style={{ height }}
              title={`${new Date(point.time).toLocaleString()} ${formatMoney(point.total, 4)}`}
            />
            <span>{formatMoney(point.total, 2)}</span>
          </div>
        );
      })}
    </div>
  );
}

function MixBar({ funding, fee }: { funding: number; fee: number }) {
  const total = Math.abs(funding) + Math.abs(fee);
  const fundingPct = total === 0 ? 0 : Math.round((Math.abs(funding) / total) * 100);

  return (
    <div className="mix-block">
      <Progress percent={fundingPct} showInfo={false} strokeColor="#22c55e" trailColor="#ef4444" />
      <div className="mix-legend">
        <span>Funding {formatMoney(funding, 4)}</span>
        <span>Fee {formatMoney(fee, 4)}</span>
      </div>
    </div>
  );
}

function formatMoney(value: number | undefined, digits = 2): string {
  return `$${(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
