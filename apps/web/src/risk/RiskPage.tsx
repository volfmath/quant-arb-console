import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Form, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import {
  createRiskRule,
  getRiskAccounts,
  getRiskOverview,
  getRiskRules,
  toggleRiskRule,
  triggerCircuitBreak,
  type RiskAccount,
  type RiskRule,
} from '../api/client';
import { useAuthStore } from '../auth/auth-store';

export function RiskPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [circuitModalOpen, setCircuitModalOpen] = useState(false);
  const [ruleForm] = Form.useForm<Pick<RiskRule, 'name' | 'metric' | 'operator' | 'threshold' | 'severity'>>();
  const [circuitForm] = Form.useForm<{ reason: string }>();

  const overviewQuery = useQuery({ queryKey: ['risk', 'overview'], queryFn: () => getRiskOverview(token ?? ''), enabled: Boolean(token) });
  const rulesQuery = useQuery({ queryKey: ['risk', 'rules'], queryFn: () => getRiskRules(token ?? ''), enabled: Boolean(token) });
  const accountsQuery = useQuery({ queryKey: ['risk', 'accounts'], queryFn: () => getRiskAccounts(token ?? ''), enabled: Boolean(token) });

  const createRuleMutation = useMutation({
    mutationFn: (values: Pick<RiskRule, 'name' | 'metric' | 'operator' | 'threshold' | 'severity'>) =>
      createRiskRule(token ?? '', values),
    onSuccess: async () => {
      message.success('风控规则已创建');
      setRuleModalOpen(false);
      ruleForm.resetFields();
      await invalidateRisk(queryClient);
    },
    onError: () => message.error('风控规则创建失败'),
  });
  const toggleRuleMutation = useMutation({
    mutationFn: (id: string) => toggleRiskRule(token ?? '', id),
    onSuccess: async () => {
      await invalidateRisk(queryClient);
    },
  });
  const circuitMutation = useMutation({
    mutationFn: (values: { reason: string }) => triggerCircuitBreak(token ?? '', values.reason),
    onSuccess: async () => {
      message.warning('熔断已触发');
      setCircuitModalOpen(false);
      circuitForm.resetFields();
      await invalidateRisk(queryClient);
      await queryClient.invalidateQueries({ queryKey: ['settings', 'audit'] });
    },
    onError: () => message.error('熔断触发失败'),
  });

  const hasError = overviewQuery.error || rulesQuery.error || accountsQuery.error;

  return (
    <section>
      <div className="page-header page-header-row">
        <div>
          <p className="eyebrow">Risk Engine</p>
          <h1>风控中心</h1>
        </div>
        <Space>
          <Button onClick={() => void invalidateRisk(queryClient)}>刷新</Button>
          <Button onClick={() => setRuleModalOpen(true)}>添加规则</Button>
          <Button danger onClick={() => setCircuitModalOpen(true)}>
            手动熔断
          </Button>
        </Space>
      </div>

      {hasError ? <Alert type="error" message="风控数据加载失败" showIcon /> : null}

      <section className="kpi-grid compact" aria-label="risk overview">
        <KpiMini title="风险等级" value={overviewQuery.data?.risk_level ?? 'loading'} />
        <KpiMini title="启用规则" value={String(overviewQuery.data?.active_rules ?? 0)} />
        <KpiMini title="交易模式" value={overviewQuery.data?.exchange_mode ?? 'mock'} />
      </section>

      {overviewQuery.data?.circuit_breaker_enabled ? (
        <Alert
          className="inline-alert"
          type="warning"
          message={`熔断已开启：${overviewQuery.data.circuit_breaker_reason}`}
          showIcon
        />
      ) : null}

      <section className="detail-grid">
        <div>
          <h2>风控规则</h2>
          <Table<RiskRule>
            rowKey="id"
            className="data-table"
            loading={rulesQuery.isLoading || toggleRuleMutation.isPending}
            columns={riskRuleColumns((id) => toggleRuleMutation.mutate(id))}
            dataSource={rulesQuery.data?.items ?? []}
            pagination={false}
            size="middle"
          />
        </div>
        <div>
          <h2>账户风险</h2>
          <Table<RiskAccount>
            rowKey="account_id"
            className="data-table"
            loading={accountsQuery.isLoading}
            columns={accountColumns}
            dataSource={accountsQuery.data?.items ?? []}
            pagination={false}
            size="middle"
          />
        </div>
      </section>

      <Modal
        title="添加风控规则"
        open={ruleModalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={createRuleMutation.isPending}
        onCancel={() => setRuleModalOpen(false)}
        onOk={() => void ruleForm.submit()}
      >
        <Form
          form={ruleForm}
          layout="vertical"
          requiredMark={false}
          initialValues={{ metric: 'leverage', operator: '<=', severity: 'high' }}
          onFinish={(values) => createRuleMutation.mutate(values)}
        >
          <Form.Item name="name" label="规则名称" rules={[{ required: true, message: '请输入规则名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="metric" label="指标">
            <Select options={metricOptions} />
          </Form.Item>
          <Form.Item name="operator" label="条件">
            <Select options={operatorOptions} />
          </Form.Item>
          <Form.Item name="threshold" label="阈值" rules={[{ required: true, message: '请输入阈值' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="severity" label="级别">
            <Select options={severityOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="手动熔断"
        open={circuitModalOpen}
        okText="触发"
        cancelText="取消"
        confirmLoading={circuitMutation.isPending}
        onCancel={() => setCircuitModalOpen(false)}
        onOk={() => void circuitForm.submit()}
      >
        <Form form={circuitForm} layout="vertical" requiredMark={false} onFinish={(values) => circuitMutation.mutate(values)}>
          <Form.Item name="reason" label="原因" rules={[{ required: true, message: '请输入熔断原因' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}

function riskRuleColumns(onToggle: (id: string) => void): ColumnsType<RiskRule> {
  return [
    { title: '规则', dataIndex: 'name', key: 'name' },
    { title: '指标', dataIndex: 'metric', key: 'metric' },
    { title: '条件', dataIndex: 'operator', key: 'operator' },
    { title: '阈值', dataIndex: 'threshold', key: 'threshold' },
    { title: '级别', dataIndex: 'severity', key: 'severity', render: renderSeverity },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? 'enabled' : 'disabled'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_, row) => (
        <Button size="small" onClick={() => onToggle(row.id)}>
          {row.enabled ? '停用' : '启用'}
        </Button>
      ),
    },
  ];
}

const accountColumns: ColumnsType<RiskAccount> = [
  { title: '账户', dataIndex: 'account_id', key: 'account_id' },
  { title: '交易所', dataIndex: 'exchange', key: 'exchange' },
  { title: '风险', dataIndex: 'risk_level', key: 'risk_level', render: renderSeverity },
  { title: '保证金', dataIndex: 'margin_usage_pct', key: 'margin_usage_pct', render: (value: number) => `${value.toFixed(2)}%` },
  { title: '持仓', dataIndex: 'open_positions', key: 'open_positions' },
];

const metricOptions = [
  { label: 'leverage', value: 'leverage' },
  { label: 'position_size', value: 'position_size' },
  { label: 'drawdown', value: 'drawdown' },
  { label: 'exchange_mode', value: 'exchange_mode' },
];

const operatorOptions = [
  { label: '<=', value: '<=' },
  { label: '>=', value: '>=' },
  { label: '=', value: '=' },
];

const severityOptions = [
  { label: 'low', value: 'low' },
  { label: 'medium', value: 'medium' },
  { label: 'high', value: 'high' },
  { label: 'critical', value: 'critical' },
];

function renderSeverity(value: string) {
  const color = value === 'critical' || value === 'high' ? 'red' : value === 'medium' ? 'orange' : 'green';
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

async function invalidateRisk(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['risk'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'risk'] }),
  ]);
}
