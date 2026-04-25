import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ConfigProvider, Layout, Menu, theme, Button } from 'antd';
import { LoginPage } from './auth/LoginPage';
import { useAuthStore } from './auth/auth-store';
import { AlertsPage } from './alerts/AlertsPage';
import {
  getDashboardAssetSummary,
  getDashboardRiskSummary,
  getDashboardStrategySummary,
} from './api/client';
import { PnlAnalyticsPage } from './analytics/PnlAnalyticsPage';
import { OpportunitiesPage } from './opportunities/OpportunitiesPage';
import { createMenuItems } from './permissions/menu';
import { SettingsPage } from './settings/SettingsPage';
import { StrategiesPage } from './strategies/StrategiesPage';
import { TasksPage } from './tasks/TasksPage';
import { RiskPage } from './risk/RiskPage';
import './styles.css';

const { Header, Sider, Content, Footer } = Layout;

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppTheme>
        <ConsoleApp />
      </AppTheme>
    </QueryClientProvider>
  );
}

function AppTheme({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#3b82f6',
          borderRadius: 6,
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

function ConsoleApp() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [selectedMenu, setSelectedMenu] = useState('dashboard');

  if (!user) {
    return <LoginPage />;
  }

  const menuItems = createMenuItems(user.permissions);

  return (
      <Layout className="app-shell">
        <Header className="top-bar">
          <div className="brand">Quant Arb Console</div>
          <div className="top-actions">
            <div className="status">WS mock · Exchange mock · Live trading off</div>
            <Button size="small" onClick={logout}>
              退出
            </Button>
          </div>
        </Header>
        <Layout>
          <Sider width={220} className="sidebar">
            <Menu
              mode="inline"
              selectedKeys={[selectedMenu]}
              items={menuItems}
              onClick={(event) => setSelectedMenu(event.key)}
            />
          </Sider>
          <Content className="content">
            {selectedMenu === 'opportunities' ? (
              <OpportunitiesPage />
            ) : selectedMenu === 'tasks' ? (
              <TasksPage />
            ) : selectedMenu === 'strategies' ? (
              <StrategiesPage />
            ) : selectedMenu === 'analytics' ? (
              <PnlAnalyticsPage />
            ) : selectedMenu === 'risk' ? (
              <RiskPage />
            ) : selectedMenu === 'alerts' ? (
              <AlertsPage />
            ) : selectedMenu === 'settings' ? (
              <SettingsPage />
            ) : (
              <DashboardShell username={user.username} role={user.role} token={useAuthStore.getState().token ?? ''} />
            )}
          </Content>
        </Layout>
        <Footer className="status-bar">API / WebSocket / Exchange adapters pending</Footer>
      </Layout>
  );
}

function DashboardShell({ username, role, token }: { username: string; role: string; token: string }) {
  const assetQuery = useQuery({
    queryKey: ['dashboard', 'asset'],
    queryFn: () => getDashboardAssetSummary(token),
    enabled: Boolean(token),
  });
  const strategyQuery = useQuery({
    queryKey: ['dashboard', 'strategy'],
    queryFn: () => getDashboardStrategySummary(token),
    enabled: Boolean(token),
  });
  const riskQuery = useQuery({
    queryKey: ['dashboard', 'risk'],
    queryFn: () => getDashboardRiskSummary(token),
    enabled: Boolean(token),
  });

  return (
    <>
      <section className="page-header">
        <p className="eyebrow">MVP Phase 1</p>
        <h1>量化套利控制台骨架</h1>
        <p className="subtitle">
          当前用户：{username} · {role}
        </p>
      </section>
      <section className="kpi-grid" aria-label="dashboard summary">
        <KpiCard title="总资产" value={formatMoney(assetQuery.data?.total_equity)} />
        <KpiCard title="今日收益" value={formatMoney(assetQuery.data?.today_pnl)} />
        <KpiCard title="运行策略" value={String(strategyQuery.data?.active_strategies ?? 0)} />
        <KpiCard title="活跃告警" value={String(riskQuery.data?.active_alerts ?? 0)} />
      </section>
    </>
  );
}

function formatMoney(value: number | undefined): string {
  return `$${(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="kpi-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
