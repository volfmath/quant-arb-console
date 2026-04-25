import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Form, Input, InputNumber, Modal, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import {
  createStrategy,
  getStrategies,
  toggleStrategy,
  updateStrategy,
  type CreateStrategyRequest,
  type StrategyRecord,
} from '../api/client';
import { useAuthStore } from '../auth/auth-store';

export function StrategiesPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CreateStrategyRequest>();
  const [editing, setEditing] = useState<StrategyRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const query = useQuery({
    queryKey: ['strategies'],
    queryFn: () => getStrategies(token ?? ''),
    enabled: Boolean(token),
  });
  const saveMutation = useMutation({
    mutationFn: (values: CreateStrategyRequest) =>
      editing ? updateStrategy(token ?? '', editing.id, values) : createStrategy(token ?? '', values),
    onSuccess: async () => {
      message.success(editing ? '策略已更新' : '策略已创建');
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
      await queryClient.invalidateQueries({ queryKey: ['strategies'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'strategy'] });
    },
    onError: () => {
      message.error('策略保存失败');
    },
  });
  const toggleMutation = useMutation({
    mutationFn: (id: string) => toggleStrategy(token ?? '', id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['strategies'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard', 'strategy'] });
    },
    onError: () => {
      message.error('策略启停失败');
    },
  });

  const strategies = query.data?.items ?? [];
  const columns: ColumnsType<StrategyRecord> = [
    { title: '策略', dataIndex: 'name', key: 'name' },
    { title: '币种', dataIndex: 'symbol', key: 'symbol' },
    { title: '状态', dataIndex: 'status', key: 'status', render: renderStatus },
    { title: '运行时长', dataIndex: 'running_duration', key: 'running_duration' },
    {
      title: '最小费率差',
      dataIndex: 'min_spread_pct',
      key: 'min_spread_pct',
      render: (value: number) => `${value.toFixed(4)}%`,
    },
    {
      title: '最大仓位',
      dataIndex: 'max_position_size',
      key: 'max_position_size',
      render: (value: number) => `$${value.toFixed(2)}`,
    },
    { title: '杠杆', dataIndex: 'leverage', key: 'leverage', render: (value: number) => `${value}x` },
    {
      title: '总收益',
      dataIndex: 'total_pnl',
      key: 'total_pnl',
      render: (value: number) => <span className={value >= 0 ? 'profit-text' : 'loss-text'}>${value.toFixed(4)}</span>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, row) => (
        <Space>
          <Button size="small" onClick={() => openEdit(row)}>
            编辑
          </Button>
          <Button size="small" onClick={() => toggleMutation.mutate(row.id)} loading={toggleMutation.isPending}>
            {row.status === 'running' ? '暂停' : '运行'}
          </Button>
        </Space>
      ),
    },
  ];

  function openCreate() {
    setEditing(null);
    form.setFieldsValue({
      name: '资金费套利_ETH',
      symbol: 'ETH/USDT:USDT',
      min_spread_pct: 0.02,
      max_position_size: 1000,
      leverage: 3,
    });
    setModalOpen(true);
  }

  function openEdit(strategy: StrategyRecord) {
    setEditing(strategy);
    form.setFieldsValue({
      name: strategy.name,
      symbol: strategy.symbol,
      min_spread_pct: strategy.min_spread_pct,
      max_position_size: strategy.max_position_size,
      leverage: strategy.leverage,
    });
    setModalOpen(true);
  }

  return (
    <section>
      <div className="page-header page-header-row">
        <div>
          <p className="eyebrow">Strategy Service</p>
          <h1>策略管理</h1>
        </div>
        <Space>
          <Button onClick={() => void query.refetch()} loading={query.isFetching}>
            刷新
          </Button>
          <Button type="primary" onClick={openCreate}>
            创建策略
          </Button>
        </Space>
      </div>

      {query.error ? <Alert type="error" message="策略列表加载失败" showIcon /> : null}

      <section className="kpi-grid compact" aria-label="strategy summary">
        <KpiMini title="总策略" value={String(query.data?.total ?? 0)} />
        <KpiMini title="运行中" value={String(strategies.filter((strategy) => strategy.status === 'running').length)} />
        <KpiMini title="活跃任务" value={String(strategies.reduce((total, strategy) => total + strategy.active_tasks, 0))} />
      </section>

      <Table<StrategyRecord>
        rowKey="id"
        className="data-table"
        loading={query.isLoading}
        columns={columns}
        dataSource={strategies}
        pagination={false}
        size="middle"
      />

      <Modal
        title={editing ? '编辑策略' : '创建策略'}
        open={modalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={saveMutation.isPending}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onOk={() => void form.submit()}
      >
        <Form<CreateStrategyRequest>
          form={form}
          layout="vertical"
          onFinish={(values) => saveMutation.mutate(values)}
          requiredMark={false}
        >
          <Form.Item name="name" label="策略名称" rules={[{ required: true, message: '请输入策略名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="symbol" label="交易对" rules={[{ required: true, message: '请输入交易对' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="min_spread_pct" label="最小费率差 %" rules={[{ required: true, message: '请输入最小费率差' }]}>
            <InputNumber min={0.0001} precision={4} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="max_position_size" label="最大仓位 USDT" rules={[{ required: true, message: '请输入最大仓位' }]}>
            <InputNumber min={1} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="leverage" label="杠杆" rules={[{ required: true, message: '请输入杠杆' }]}>
            <InputNumber min={1} max={10} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}

function renderStatus(value: StrategyRecord['status']) {
  const color = value === 'running' ? 'green' : value === 'paused' ? 'orange' : 'blue';
  return <Tag color={color}>{value}</Tag>;
}

function KpiMini({ title, value }: { title: string; value: string }) {
  return (
    <div className="kpi-card mini">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
