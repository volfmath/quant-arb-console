# Layout 与路由结构（Layout & Routing）

本文件定义前端的 Layout 组件层级和路由配置。  
**参考基准**：三张 UI 截图（Dashboard、套利机会发现、资金费套利任务列表）。

---

## 1. Layout 组件层级

```text
<App>
  <AuthProvider>                     ← JWT 认证上下文
    <PermissionProvider>             ← 权限上下文（role + permissions[]）
      <WebSocketProvider>            ← 全局 WS 连接管理
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<AppLayout />}>          ← 主框架布局
            <Route path="/dashboard" ... />
            <Route path="/opportunities" ... />
            ...
          </Route>

          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </WebSocketProvider>
    </PermissionProvider>
  </AuthProvider>
</App>
```

---

## 2. AppLayout 结构

参照截图，**没有独立 TopBar**。系统状态集成在侧边栏底部，页面标题和操作按钮在内容区顶部。

```text
┌────────────┬────────────────────────────────────────────────┐
│            │  页面标题区                                     │
│            │  量化交易系统 / 概览          [自定义预警] [⚙]  │
│  Sidebar   ├────────────────────────────────────────────────┤
│  (64px)    │                                                │
│            │              <Outlet />                        │
│  ┌──────┐  │          主内容区（页面路由出口）               │
│  │ Logo │  │                                                │
│  ├──────┤  │                                        ┌──────┤
│  │ 概览 │  │                                        │Detail│
│  │ 策略 │  │                                        │Panel │
│  │ 交易 │  │                                        │(按需)│
│  │ 套利 │  │                                        │      │
│  │ 资金 │  │                                        │      │
│  │ 历史 │  │                                        │      │
│  │ 预算 │  │                                        │      │
│  │ 数据 │  │                                        │      │
│  │ 回测 │  │                                        │      │
│  │ 设置 │  │                                        │      │
│  ├──────┤  │                                        │      │
│  │API状态│  │                                        │      │
│  │已连接 │  │                                        │      │
│  │      │  │                                        │      │
│  │15:47 │  │                                        │      │
│  │UTC+8 │  │                                        │      │
│  │      │  │                                        │      │
│  │自动  │  │                                        │      │
│  │刷新  │  │                                        │      │
│  │10s ▼ │  │                                        │      │
│  └──────┘  │                                        │      │
└────────────┴────────────────────────────────────────┴──────┘
```

### 2.1 AppLayout 组件拆分

| 组件                  | 职责                                               |
|-----------------------|---------------------------------------------------|
| `AppLayout`           | 最外层 flex 容器，组合 Sidebar + Content            |
| `Sidebar`             | 图标导航 + 底部状态区                               |
| `SidebarMenu`         | 菜单项列表，根据权限过滤                            |
| `SidebarStatus`       | 底部固定：API 状态、系统时间、自动刷新间隔           |
| `ContentArea`         | 页面标题栏 + `<Outlet />`                           |
| `PageHeader`          | 每页顶部：标题、副标题、右侧操作按钮                |
| `DetailPanel`         | 右侧分栏详情面板（机会页等使用），非覆盖式           |

### 2.2 Sidebar 详细结构

参照截图，侧边栏为**固定图标模式**（`64px` 宽），不可展开：

```text
┌──────────┐
│   ⚡     │  ← Logo（蓝色闪电图标）
│          │
│   🏠     │  ← 概览（选中态：蓝色背景 + 白色图标）
│  概览    │
│          │
│   ⚙     │  ← 策略管理
│  策略    │
│  管理    │
│          │
│   📊     │  ← 交易监控
│  交易    │
│  监控    │
│          │
│   🎯     │  ← 套利机会
│  套利    │
│  机会    │
│          │
│   💰     │  ← 资金管理
│  资金    │
│  管理    │
│          │
│   🕐     │  ← 历史记录
│  历史    │
│  记录    │
│          │
│   🛡     │  ← 预算监控
│  预算    │
│  监控    │
│          │
│   📈     │  ← 数据分析
│  数据    │
│  分析    │
│          │
│   🔄     │  ← 策略回测
│  回测    │
│  中心    │
│          │
│   ⚙     │  ← 设置中心
│  系统    │
│  设置    │
│          │
│ ──────── │
│ API连接  │
│ > 已连接 │  ← 绿色 = 正常, 红色 = 断开
│          │
│ 15:47:26 │
│ (UTC+8)  │
│          │
│ 自动刷新 │  ← 仅在实时数据页面显示
│ 10s  ▼   │
└──────────┘
```

**选中态样式**：
- 选中菜单项：蓝色圆角背景 `--color-primary`，白色图标
- 未选中：透明背景，灰色图标 `--text-muted`
- 图标下方文字：`Caption`（12px），居中对齐

### 2.3 PageHeader 结构

每个页面内容区顶部自带标题和操作按钮（替代传统 TopBar）：

```text
┌─────────────────────────────────────────────────────────┐
│  量化交易系统                              [自定义预警] [⚙] │
│  概览                                                    │
└─────────────────────────────────────────────────────────┘
```

- **左侧**：系统名称（H1）+ 页面子标题（Caption）
- **右侧**：页面级操作按钮（如自定义预警、设置图标）
- 高度 `56px`

---

## 3. 路由表

```typescript
const routes = [
  {
    path: '/login',
    element: <LoginPage />,
    public: true,
  },
  {
    element: <AppLayout />,
    children: [
      // 总览
      { path: '/', redirect: '/dashboard' },
      { path: '/dashboard', element: <DashboardPage />, permission: 'dashboard:view' },

      // 策略
      { path: '/strategies', element: <StrategiesPage />, permission: 'strategy:view' },

      // 交易监控
      { path: '/trading', element: <TradingPage />, permission: 'task:view' },

      // 套利机会
      { path: '/opportunities', element: <OpportunitiesPage />, permission: 'opportunity:view' },

      // 资金管理
      { path: '/funds', element: <FundsPage />, permission: 'account:view' },

      // 历史记录
      { path: '/history', element: <HistoryPage />, permission: 'task:view' },

      // 预算监控（风控）
      { path: '/risk', element: <RiskCenterPage />, permission: 'risk:view' },

      // 数据分析
      { path: '/analytics', element: <AnalyticsPage />, permission: 'analytics:view' },

      // 回测中心（V2）
      { path: '/backtest', element: <BacktestPage />, permission: 'backtest:view' },

      // 设置中心
      { path: '/settings', element: <SettingsPage />, permission: 'settings:manage' },
      { path: '/settings/exchanges', element: <ExchangesPage />, permission: 'exchange:manage' },
      { path: '/settings/accounts', element: <AccountsPage />, permission: 'account:manage' },
      { path: '/settings/users', element: <UsersPage />, permission: 'user:manage' },
      { path: '/settings/audit-logs', element: <AuditLogsPage />, permission: 'audit:view' },
    ],
  },
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
];
```

---

## 4. 路由守卫（ProtectedRoute）

```text
ProtectedRoute
  ├── 未登录 → redirect to /login
  ├── 已登录但无权限 → redirect to /403
  └── 已登录且有权限 → 渲染 children
```

---

## 5. 全局状态管理（Store 拆分）

| Store 名称            | 管理内容                                       | 持久化       |
|-----------------------|------------------------------------------------|-------------|
| `useAuthStore`        | token、用户信息、登录/登出                     | localStorage |
| `usePermStore`        | 角色、权限列表、权限校验方法                   | 内存         |
| `useLayoutStore`      | 详情面板开关/内容/宽度                         | 内存         |
| `useAlertStore`       | 未读告警列表、告警计数                         | 内存         |
| `useWsStore`          | WebSocket 连接状态、重连逻辑                   | 内存         |
| `useRefreshStore`     | 自动刷新间隔、最后刷新时间                     | localStorage |
| `useExchangeStatus`   | 各交易所 API 连接状态（侧边栏底部显示用）       | 内存         |

页面级数据（机会列表、任务列表等）使用 **React Query** 管理，不放在 Zustand 中。

---

## 6. WebSocket 连接管理

```text
WebSocketProvider（全局单例）
  ├── 连接地址：ws://{API_HOST}/ws?token={JWT}
  ├── 自动重连：断线后 1s / 2s / 4s / 8s / 16s / 30s 指数退避
  ├── 心跳：每 30s 发送 ping，超时 10s 无 pong 视为断线
  ├── 连接状态 → 更新侧边栏底部"API连接"状态指示
  └── 事件分发：
       ├── opportunity:update → 触发机会列表 React Query invalidate
       ├── task:status_change → 触发任务卡片列表 invalidate
       ├── order:update → 触发订单数据 invalidate
       ├── alert:new → 更新 useAlertStore
       ├── pnl:snapshot → 触发 Dashboard KPI 更新
       └── system:exchange_status → 更新 useExchangeStatus
```

---

## 7. 自动刷新机制

参照截图3 侧边栏底部的"自动刷新 10s"：

```typescript
// useAutoRefresh hook
const useAutoRefresh = (queryKey: string[], interval: number) => {
  // interval 来自 useRefreshStore
  // 支持 5s / 10s / 30s / 60s / 手动
  // 仅在页面可见时（document.visibilityState === 'visible'）触发
  // 通过 React Query refetchInterval 实现
};
```

- 刷新间隔在侧边栏底部 Dropdown 中选择
- 仅在实时数据页面（套利机会、交易监控）显示此 Dropdown
- Dashboard 和分析页不显示（使用 WebSocket 推送 + 固定轮询）
