import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider, Layout, Menu, theme, Button } from 'antd';
import { LoginPage } from './auth/LoginPage';
import { useAuthStore } from './auth/auth-store';
import { createMenuItems } from './permissions/menu';
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
            <Menu mode="inline" selectedKeys={['dashboard']} items={menuItems} />
          </Sider>
          <Content className="content">
            <section className="page-header">
              <p className="eyebrow">MVP Phase 1</p>
              <h1>量化套利控制台骨架</h1>
              <p className="subtitle">当前用户：{user.username} · {user.role}</p>
            </section>
            <section className="kpi-grid" aria-label="dashboard summary">
              <KpiCard title="总资产" value="$0.00" />
              <KpiCard title="今日收益" value="$0.00" />
              <KpiCard title="运行策略" value="0" />
              <KpiCard title="活跃告警" value="0" />
            </section>
          </Content>
        </Layout>
        <Footer className="status-bar">API / WebSocket / Exchange adapters pending</Footer>
      </Layout>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="kpi-card">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
  );
}
