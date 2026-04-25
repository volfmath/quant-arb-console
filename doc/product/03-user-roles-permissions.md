# 用户角色与权限（User Roles & Permissions）

本文件定义 Quant Arb Console 的 RBAC 权限模型，覆盖角色定义、权限矩阵和鉴权规则。

---

## 1. 角色定义

| 角色              | 代码标识          | 说明                                               |
|-------------------|-------------------|----------------------------------------------------|
| 超级管理员        | `super_admin`     | 系统最高权限，负责配置、安全与合规                 |
| 交易员            | `trader`          | 日常操作角色，发现机会、创建任务、监控执行与收益   |
| 风控员            | `risk_manager`    | 负责风控规则、告警处理、风险监控                   |
| 观察员 / 合伙人   | `viewer`          | 只读角色，查看 Dashboard、收益报表、资产总览       |

- 一个用户只能绑定一个角色（MVP 阶段不支持多角色）
- `super_admin` 拥有所有权限，下表中不再逐项标注

---

## 2. 权限矩阵

### 2.1 图例

| 标记 | 含义       |
|------|-----------|
| ✅   | 允许       |
| 👁️   | 只读       |
| ❌   | 不可见/禁止 |

### 2.2 页面级权限

| 页面 / 功能            | super_admin | trader | risk_manager | viewer |
|------------------------|:-----------:|:------:|:------------:|:------:|
| Dashboard              | ✅          | ✅     | ✅           | 👁️    |
| 套利机会列表           | ✅          | ✅     | 👁️          | 👁️    |
| 套利机会详情           | ✅          | ✅     | 👁️          | 👁️    |
| 套利任务列表           | ✅          | ✅     | 👁️          | ❌     |
| 套利任务详情           | ✅          | ✅     | 👁️          | ❌     |
| 订单管理               | ✅          | ✅     | 👁️          | ❌     |
| 持仓管理               | ✅          | ✅     | 👁️          | ❌     |
| 策略管理               | ✅          | ✅     | ❌           | ❌     |
| 风控中心               | ✅          | ❌     | ✅           | ❌     |
| 告警中心               | ✅          | 👁️    | ✅           | ❌     |
| 收益分析               | ✅          | ✅     | 👁️          | 👁️    |
| 资产总览               | ✅          | ✅     | 👁️          | 👁️    |
| 交易所管理             | ✅          | ❌     | ❌           | ❌     |
| 账户管理               | ✅          | ❌     | ❌           | ❌     |
| 用户 & 权限            | ✅          | ❌     | ❌           | ❌     |
| 审计日志               | ✅          | ❌     | ❌           | ❌     |
| 系统设置               | ✅          | ❌     | ❌           | ❌     |

### 2.3 操作级权限

| 操作                         | super_admin | trader | risk_manager | viewer |
|------------------------------|:-----------:|:------:|:------------:|:------:|
| 创建套利任务                 | ✅          | ✅     | ❌           | ❌     |
| 暂停 / 恢复任务             | ✅          | ✅     | ✅           | ❌     |
| 停止 / 关闭任务             | ✅          | ✅     | ✅           | ❌     |
| 手动平仓                     | ✅          | ✅     | ✅           | ❌     |
| 修改策略参数                 | ✅          | ✅     | ❌           | ❌     |
| 启用 / 停用策略             | ✅          | ✅     | ❌           | ❌     |
| 创建 / 编辑风控规则         | ✅          | ❌     | ✅           | ❌     |
| 触发熔断                     | ✅          | ❌     | ✅           | ❌     |
| 确认 / 忽略告警             | ✅          | ❌     | ✅           | ❌     |
| 添加交易所 / API Key        | ✅          | ❌     | ❌           | ❌     |
| 创建 / 编辑用户             | ✅          | ❌     | ❌           | ❌     |
| 分配角色                     | ✅          | ❌     | ❌           | ❌     |
| 查看审计日志                 | ✅          | ❌     | ❌           | ❌     |
| 导出报表                     | ✅          | ✅     | ✅           | 👁️    |

---

## 3. 权限数据模型

### 3.1 核心表

```text
users
├── id (UUID)
├── username (VARCHAR, UNIQUE)
├── email (VARCHAR, UNIQUE)
├── password_hash (VARCHAR)
├── role (ENUM: super_admin, trader, risk_manager, viewer)
├── status (ENUM: active, disabled)
├── last_login_at (TIMESTAMPTZ)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

permissions（权限定义表，系统预置）
├── id (UUID)
├── code (VARCHAR, UNIQUE)        -- 如 "task:create", "risk:edit_rule"
├── name (VARCHAR)                -- 显示名称
├── module (VARCHAR)              -- 所属模块：opportunity, task, risk, system ...
└── description (TEXT)

role_permissions（角色-权限映射）
├── role (ENUM)
├── permission_code (VARCHAR, FK → permissions.code)
└── PRIMARY KEY (role, permission_code)
```

### 3.2 权限编码规范

格式：`{module}:{action}`

| 模块            | 权限 code 示例                                       |
|----------------|------------------------------------------------------|
| dashboard      | `dashboard:view`                                     |
| opportunity    | `opportunity:view`, `opportunity:view_detail`        |
| task           | `task:view`, `task:create`, `task:pause`, `task:stop` |
| order          | `order:view`, `order:close_position`                 |
| position       | `position:view`                                      |
| strategy       | `strategy:view`, `strategy:edit`, `strategy:toggle`  |
| risk           | `risk:view`, `risk:edit_rule`, `risk:circuit_break`  |
| alert          | `alert:view`, `alert:acknowledge`, `alert:dismiss`   |
| analytics      | `analytics:view`, `analytics:export`                 |
| exchange       | `exchange:manage`                                    |
| account        | `account:manage`                                     |
| user           | `user:manage`, `user:assign_role`                    |
| audit          | `audit:view`                                         |
| settings       | `settings:manage`                                    |

---

## 4. 鉴权流程

```text
请求进入
  → JWT Token 校验（过期/篡改 → 401）
    → 解析 user.role
      → 查询 role_permissions 获取权限列表
        → 比对当前请求所需 permission_code
          → 通过 → 放行
          → 不通过 → 403
```

### 4.1 前端鉴权

- 登录后将用户 `role` 和 `permissions[]` 存入 Zustand store
- 左侧菜单根据权限动态渲染（无权限的菜单项不展示）
- 按钮级别通过 `<PermissionGuard code="task:create">` 组件控制显隐
- 路由级别通过 `ProtectedRoute` HOC 拦截，无权限跳转 403 页面

### 4.2 后端鉴权

- API Gateway 层统一拦截，基于 `@RequirePermission('task:create')` 装饰器
- 前后端双重校验，前端只做 UX 优化，后端是真正的安全边界

---

## 5. 安全约束

1. **API Key 不可明文展示**：配置后仅显示末 4 位，编辑时需重新输入
2. **敏感操作二次确认**：删除交易所、修改风控规则、手动平仓需弹窗确认
3. **会话超时**：JWT 有效期 24h，前端 30 分钟无操作自动锁屏
4. **登录审计**：所有登录/登出事件写入 `audit_logs`
5. **IP 白名单**（可选，V2）：限制后台访问来源 IP
