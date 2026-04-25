import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { acknowledgeAlert, dismissAlert, getAlerts, type AlertRecord } from '../api/client';
import { useAuthStore } from '../auth/auth-store';

export function AlertsPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['alerts'],
    queryFn: () => getAlerts(token ?? ''),
    enabled: Boolean(token),
  });
  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'acknowledge' | 'dismiss' }) =>
      action === 'acknowledge' ? acknowledgeAlert(token ?? '', id) : dismissAlert(token ?? '', id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['alerts'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'risk'] });
    },
  });

  const columns: ColumnsType<AlertRecord> = [
    { title: '级别', dataIndex: 'severity', key: 'severity', render: renderSeverity },
    { title: '来源', dataIndex: 'source', key: 'source' },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '状态', dataIndex: 'status', key: 'status', render: (value: string) => <Tag>{value}</Tag> },
    {
      title: '操作',
      key: 'action',
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => mutation.mutate({ id: row.id, action: 'acknowledge' })}>
            确认
          </Button>
          <Button size="small" danger onClick={() => mutation.mutate({ id: row.id, action: 'dismiss' })}>
            忽略
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <section>
      <div className="page-header page-header-row">
        <div>
          <p className="eyebrow">Risk Operations</p>
          <h1>告警中心</h1>
        </div>
        <Button onClick={() => void query.refetch()} loading={query.isFetching}>
          刷新
        </Button>
      </div>

      {query.error ? <Alert type="error" message="告警列表加载失败" showIcon /> : null}

      <Table<AlertRecord>
        rowKey="id"
        className="data-table"
        loading={query.isLoading || mutation.isPending}
        columns={columns}
        dataSource={query.data?.items ?? []}
        pagination={false}
        size="middle"
      />
    </section>
  );
}

function renderSeverity(value: AlertRecord['severity']) {
  const color = value === 'critical' || value === 'high' ? 'red' : value === 'medium' ? 'orange' : 'green';
  return <Tag color={color}>{value}</Tag>;
}
