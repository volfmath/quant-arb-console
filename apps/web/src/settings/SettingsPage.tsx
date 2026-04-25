import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Button, Form, Input, Modal, Select, Space, Table, Tabs, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useState } from 'react';
import {
  createAccount,
  createExchange,
  createUser,
  deleteAccount,
  getAccounts,
  getAuditLogs,
  getExchanges,
  getSystemStatus,
  getUsers,
  updateUserRole,
  type AccountRecord,
  type AuditLogRecord,
  type ExchangeRecord,
  type UserRecord,
} from '../api/client';
import { useAuthStore } from '../auth/auth-store';

type ModalKind = 'exchange' | 'account' | 'user' | null;

export function SettingsPage() {
  const token = useAuthStore((state) => state.token);
  const queryClient = useQueryClient();
  const [modalKind, setModalKind] = useState<ModalKind>(null);
  const [form] = Form.useForm<Record<string, unknown>>();

  const statusQuery = useQuery({ queryKey: ['system-status'], queryFn: () => getSystemStatus(token ?? ''), enabled: Boolean(token) });
  const exchangesQuery = useQuery({ queryKey: ['settings', 'exchanges'], queryFn: () => getExchanges(token ?? ''), enabled: Boolean(token) });
  const accountsQuery = useQuery({ queryKey: ['settings', 'accounts'], queryFn: () => getAccounts(token ?? ''), enabled: Boolean(token) });
  const usersQuery = useQuery({ queryKey: ['settings', 'users'], queryFn: () => getUsers(token ?? ''), enabled: Boolean(token) });
  const auditQuery = useQuery({ queryKey: ['settings', 'audit'], queryFn: () => getAuditLogs(token ?? ''), enabled: Boolean(token) });

  const createMutation = useMutation<unknown, Error, Record<string, unknown>>({
    mutationFn: (values: Record<string, unknown>) => {
      if (modalKind === 'exchange') {
        return createExchange(token ?? '', {
          name: String(values.name),
          code: String(values.code),
          is_testnet: values.is_testnet !== 'false',
        });
      }
      if (modalKind === 'account') {
        return createAccount(token ?? '', {
          exchange_code: String(values.exchange_code),
          name: String(values.name),
          is_testnet: values.is_testnet !== 'false',
        });
      }
      return createUser(token ?? '', {
        username: String(values.username),
        role: values.role as UserRecord['role'],
      });
    },
    onSuccess: async () => {
      message.success('设置已保存');
      setModalKind(null);
      form.resetFields();
      await invalidateSettings(queryClient);
    },
    onError: () => {
      message.error('设置保存失败');
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: (id: string) => deleteAccount(token ?? '', id),
    onSuccess: async () => {
      await invalidateSettings(queryClient);
    },
  });
  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UserRecord['role'] }) => updateUserRole(token ?? '', id, role),
    onSuccess: async () => {
      await invalidateSettings(queryClient);
    },
  });

  const hasError = statusQuery.error || exchangesQuery.error || accountsQuery.error || usersQuery.error || auditQuery.error;

  return (
    <section>
      <div className="page-header page-header-row">
        <div>
          <p className="eyebrow">System Settings</p>
          <h1>设置中心</h1>
        </div>
        <Button onClick={() => void invalidateSettings(queryClient)}>刷新</Button>
      </div>

      {hasError ? <Alert type="error" message="设置数据加载失败" showIcon /> : null}

      <section className="kpi-grid compact" aria-label="system status">
        <KpiMini title="API" value={statusQuery.data?.api_connection ?? 'loading'} />
        <KpiMini title="交易服务" value={statusQuery.data?.trading_service ?? 'loading'} />
        <KpiMini title="交易模式" value={statusQuery.data?.exchange_mode ?? 'mock'} />
      </section>

      <Tabs
        items={[
          {
            key: 'exchanges',
            label: '交易所',
            children: (
              <>
                <TableToolbar onCreate={() => openModal('exchange')} />
                <Table<ExchangeRecord>
                  rowKey="id"
                  className="data-table"
                  loading={exchangesQuery.isLoading}
                  columns={exchangeColumns}
                  dataSource={exchangesQuery.data?.items ?? []}
                  pagination={false}
                  size="middle"
                />
              </>
            ),
          },
          {
            key: 'accounts',
            label: '账户',
            children: (
              <>
                <TableToolbar onCreate={() => openModal('account')} />
                <Table<AccountRecord>
                  rowKey="id"
                  className="data-table"
                  loading={accountsQuery.isLoading || deleteAccountMutation.isPending}
                  columns={accountColumns((id) => deleteAccountMutation.mutate(id))}
                  dataSource={accountsQuery.data?.items ?? []}
                  pagination={false}
                  size="middle"
                />
              </>
            ),
          },
          {
            key: 'users',
            label: '用户',
            children: (
              <>
                <TableToolbar onCreate={() => openModal('user')} />
                <Table<UserRecord>
                  rowKey="id"
                  className="data-table"
                  loading={usersQuery.isLoading || roleMutation.isPending}
                  columns={userColumns((id, role) => roleMutation.mutate({ id, role }))}
                  dataSource={usersQuery.data?.items ?? []}
                  pagination={false}
                  size="middle"
                />
              </>
            ),
          },
          {
            key: 'audit',
            label: '审计日志',
            children: (
              <Table<AuditLogRecord>
                rowKey="id"
                className="data-table"
                loading={auditQuery.isLoading}
                columns={auditColumns}
                dataSource={auditQuery.data?.items ?? []}
                pagination={false}
                size="middle"
              />
            ),
          },
        ]}
      />

      <Modal
        title={modalKind === 'exchange' ? '添加交易所' : modalKind === 'account' ? '添加账户' : '添加用户'}
        open={Boolean(modalKind)}
        okText="保存"
        cancelText="取消"
        confirmLoading={createMutation.isPending}
        onCancel={() => setModalKind(null)}
        onOk={() => void form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(values) => createMutation.mutate(values)} requiredMark={false}>
          {modalKind === 'exchange' ? <ExchangeForm /> : modalKind === 'account' ? <AccountForm /> : <UserForm />}
        </Form>
      </Modal>
    </section>
  );

  function openModal(kind: ModalKind) {
    setModalKind(kind);
    form.resetFields();
  }
}

const exchangeColumns: ColumnsType<ExchangeRecord> = [
  { title: '名称', dataIndex: 'name', key: 'name' },
  { title: '代码', dataIndex: 'code', key: 'code' },
  { title: '环境', dataIndex: 'is_testnet', key: 'is_testnet', render: (value: boolean) => (value ? 'testnet/mock' : 'live') },
  { title: '状态', dataIndex: 'status', key: 'status', render: (value: string) => <Tag color="green">{value}</Tag> },
];

function accountColumns(onDelete: (id: string) => void): ColumnsType<AccountRecord> {
  return [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '交易所', dataIndex: 'exchange_code', key: 'exchange_code' },
    { title: '环境', dataIndex: 'is_testnet', key: 'is_testnet', render: (value: boolean) => (value ? 'testnet/mock' : 'live') },
    { title: '状态', dataIndex: 'status', key: 'status', render: (value: string) => <Tag color="green">{value}</Tag> },
    {
      title: '操作',
      key: 'action',
      render: (_, row) => (
        <Button size="small" danger onClick={() => onDelete(row.id)}>
          删除
        </Button>
      ),
    },
  ];
}

function userColumns(onRoleChange: (id: string, role: UserRecord['role']) => void): ColumnsType<UserRecord> {
  return [
    { title: '用户名', dataIndex: 'username', key: 'username' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (value: UserRecord['role'], row) => (
        <Select
          value={value}
          size="small"
          style={{ width: 140 }}
          options={roleOptions}
          onChange={(role) => onRoleChange(row.id, role)}
        />
      ),
    },
    { title: '状态', dataIndex: 'status', key: 'status', render: (value: string) => <Tag color="green">{value}</Tag> },
  ];
}

const auditColumns: ColumnsType<AuditLogRecord> = [
  { title: '动作', dataIndex: 'action', key: 'action' },
  { title: '资源', dataIndex: 'resourceType', key: 'resourceType' },
  { title: '资源 ID', dataIndex: 'resourceId', key: 'resourceId' },
  { title: '时间', dataIndex: 'createdAt', key: 'createdAt', render: (value: string) => new Date(value).toLocaleString() },
];

const roleOptions = [
  { label: 'super_admin', value: 'super_admin' },
  { label: 'trader', value: 'trader' },
  { label: 'risk_manager', value: 'risk_manager' },
  { label: 'viewer', value: 'viewer' },
];

function TableToolbar({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="table-toolbar">
      <Button type="primary" onClick={onCreate}>
        添加
      </Button>
    </div>
  );
}

function ExchangeForm() {
  return (
    <>
      <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="code" label="代码" rules={[{ required: true, message: '请输入代码' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="is_testnet" label="环境" initialValue="true">
        <Select options={environmentOptions} />
      </Form.Item>
    </>
  );
}

function AccountForm() {
  return (
    <>
      <Form.Item name="exchange_code" label="交易所代码" rules={[{ required: true, message: '请输入交易所代码' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="name" label="账户名称" rules={[{ required: true, message: '请输入账户名称' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="is_testnet" label="环境" initialValue="true">
        <Select options={environmentOptions} />
      </Form.Item>
    </>
  );
}

function UserForm() {
  return (
    <>
      <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
        <Input />
      </Form.Item>
      <Form.Item name="role" label="角色" initialValue="viewer">
        <Select options={roleOptions} />
      </Form.Item>
    </>
  );
}

const environmentOptions = [
  { label: 'testnet/mock', value: 'true' },
  { label: 'live', value: 'false' },
];

function KpiMini({ title, value }: { title: string; value: string }) {
  return (
    <div className="kpi-card mini">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}

async function invalidateSettings(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['system-status'] }),
    queryClient.invalidateQueries({ queryKey: ['settings'] }),
  ]);
}
