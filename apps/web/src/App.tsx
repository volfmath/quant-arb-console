import {
  AlertOutlined,
  DashboardOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { ConfigProvider, Layout, Menu, theme } from 'antd';
import './styles.css';

const { Header, Sider, Content, Footer } = Layout;

const menuItems = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: 'opportunities', icon: <ThunderboltOutlined />, label: '套利机会' },
  { key: 'risk', icon: <SafetyOutlined />, label: '风控中心' },
  { key: 'alerts', icon: <AlertOutlined />, label: '告警中心' },
];

export function App() {
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
      <Layout className="app-shell">
        <Header className="top-bar">
          <div className="brand">Quant Arb Console</div>
          <div className="status">WS mock · Exchange mock · Live trading off</div>
        </Header>
        <Layout>
          <Sider width={220} className="sidebar">
            <Menu mode="inline" selectedKeys={['dashboard']} items={menuItems} />
          </Sider>
          <Content className="content">
            <section className="page-header">
              <p className="eyebrow">MVP Phase 1</p>
              <h1>量化套利控制台骨架</h1>
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
    </ConfigProvider>
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

