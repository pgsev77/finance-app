# 个人财务管理系统 -- 技术架构文档

## 技术决策

| 决策项 | 方案 | 理由 |
|--------|------|------|
| 部署 | Docker Compose（PostgreSQL + FastAPI + Nginx） | 小团队单机部署足够 |
| 数据库 | PostgreSQL | 关系型数据为主，JSON 支持好 |
| 认证 | JWT + HttpOnly Cookie + Authorization Header | Web 端走 Cookie，移动端/Javis 走 Bearer Token |
| 金额存储 | INTEGER 存分（10050 = 100.50元） | 避免浮点精度问题 |
| 软删除 | 交易记录支持软删除 | 财务数据不可硬删 |
| API前缀 | /api/v1/ | 版本化管理 |
| UI组件库 | shadcn/ui + Tailwind CSS | PRD 已确定 |
| 多用户隔离 | 所有业务表通过 user_id 外键隔离 | 简单直接，查询加 WHERE user_id = ? |
| 用户规模 | 设计容量 10 人，架构支持扩展到 100+ | 预留索引和分页，不做分库分表 |
| 角色模型 | admin / user 两级 | 10 人规模不需要 RBAC |
| 飞书集成 | user_oauth 表绑定 open_id | 独立表，方便未来扩展其他 OAuth provider |
| 自然语言解析 | 后端 FastAPI 调用 LLM API | 解析逻辑集中后端，Javis 只做转发 |

---

## 数据模型

共 7 张表。所有业务表（accounts, categories, transactions, subscriptions）通过 user_id 外键隔离。

### ER 关系

```
users 1──* accounts
users 1──* categories
users 1──* transactions
users 1──* subscriptions
users 1──1 user_oauth
users 1──1 user_settings
```

### users

```sql
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role                  VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    force_change_password BOOLEAN      NOT NULL DEFAULT TRUE,
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

- role: admin 可管理所有用户，user 只能操作自己的数据
- force_change_password: TRUE 时用户登录后必须修改密码才能使用系统
- is_active: FALSE 时禁止登录，但数据保留
- 管理员创建用户时 force_change_password 默认 TRUE，用户修改密码后设为 FALSE

### user_oauth

```sql
CREATE TABLE user_oauth (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL UNIQUE REFERENCES users(id),
    provider      VARCHAR(20) NOT NULL DEFAULT 'feishu',
    provider_uid  VARCHAR(100) NOT NULL,  -- feishu open_id
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_uid)
);
```

- UNIQUE(user_id): 一个用户只能绑定一个 provider 账号（当前阶段足够）
- UNIQUE(provider, provider_uid): 一个 open_id 只能绑一个用户
- 预留 provider 字段支持未来微信、钉钉等 OAuth

### user_settings

```sql
CREATE TABLE user_settings (
    user_id               INTEGER PRIMARY KEY REFERENCES users(id),
    default_needs_confirm BOOLEAN NOT NULL DEFAULT TRUE,
    confirm_rules         JSONB   NOT NULL DEFAULT '[]',
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- confirm_rules 存储分类级免确认规则，JSON 数组格式：
  ```json
  [
    {"category": "餐饮", "max_amount": 5000, "needs_confirm": false},
    {"category": "交通", "max_amount": 3000, "needs_confirm": false}
  ]
  ```
- 金额单位：分（与 transactions 表一致）
- 不单独建 confirm_rules 表的理由：规则数量少（预计不超过 20 条/用户），JSONB 足够，读多写少

### accounts

```sql
CREATE TABLE accounts (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER    NOT NULL REFERENCES users(id),
    name        VARCHAR(50) NOT NULL,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('cash', 'bank', 'wechat', 'alipay', 'stock', 'fund')),
    balance     INTEGER    NOT NULL DEFAULT 0,       -- 余额，单位：分
    icon        VARCHAR(50),
    sort_order  INTEGER    NOT NULL DEFAULT 0,
    is_active   BOOLEAN    NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name)
);
```

- user_id 外键：每个用户独立管理自己的账户
- type: 6 种预设类型
- UNIQUE(user_id, name): 同一用户下账户名不重复

### categories

```sql
CREATE TABLE categories (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER    NOT NULL REFERENCES users(id),
    name        VARCHAR(50) NOT NULL,
    type        VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income')),
    parent_id   INTEGER REFERENCES categories(id),
    icon        VARCHAR(50),
    color       VARCHAR(20),
    sort_order  INTEGER    NOT NULL DEFAULT 0,
    is_active   BOOLEAN    NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, name, parent_id)
);
```

- parent_id 自引用：NULL 为一级分类，非 NULL 为二级分类
- type: 分类属于支出还是收入

### transactions

```sql
CREATE TABLE transactions (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER    NOT NULL REFERENCES users(id),
    type            VARCHAR(10) NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    amount          INTEGER    NOT NULL,                -- 金额，单位：分
    category_id     INTEGER REFERENCES categories(id),
    account_id      INTEGER REFERENCES accounts(id),
    to_account_id   INTEGER REFERENCES accounts(id),    -- 转账目标账户（type=transfer 时必填）
    date            DATE        NOT NULL,
    note            TEXT,
    needs_confirm   BOOLEAN     NOT NULL DEFAULT TRUE,  -- 是否需要确认（飞书记账流程用）
    confirmed_at    TIMESTAMPTZ,                         -- 确认时间（NULL=未确认）
    is_deleted      BOOLEAN     NOT NULL DEFAULT FALSE,  -- 软删除
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);
```

- needs_confirm: 飞书记账流程用。Web 端手动录入的交易默认 FALSE（用户主动操作无需确认）
- confirmed_at: 确认时间，NULL 表示待确认
- 双索引：按日期排序（列表查询）+ 按类型过滤（统计查询）
- amount 存 INTEGER 分，前端展示时除以 100

### subscriptions

```sql
CREATE TABLE subscriptions (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER    NOT NULL REFERENCES users(id),
    name          VARCHAR(100) NOT NULL,
    amount        INTEGER    NOT NULL,                -- 每次扣费金额，单位：分
    category_id   INTEGER REFERENCES categories(id),
    account_id    INTEGER REFERENCES accounts(id),
    cycle         VARCHAR(20) NOT NULL CHECK (cycle IN ('weekly', 'monthly', 'yearly', 'custom')),
    cycle_days    INTEGER,                            -- 自定义周期天数（cycle=custom 时使用）
    next_date     DATE        NOT NULL,               -- 下次扣费日期
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    note          TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_next ON subscriptions(user_id, next_date);
```

- next_date 索引：用于查询即将到期的订阅

---

## 认证方案

### JWT Token 流程

1. 用户登录 → 后端验证密码 → 签发 JWT（payload 含 user_id, role）
2. 响应同时设置：
   - `Set-Cookie: token=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
   - 响应体 `{"token": "<jwt>", "user": {...}}`（供移动端/脚本使用）
3. 后续请求：后端优先读 Cookie，无 Cookie 时读 `Authorization: Bearer <token>`
4. Token 过期时间：7 天
5. Token 刷新：过期后重新登录（MVP 不做 refresh token）

### 自动注册（飞书首次对话）

流程：
1. Javis 收到用户消息，提取 open_id
2. Javis 调用 `POST /api/v1/auth/auto-register`，传 `{"provider": "feishu", "provider_uid": "ou_xxx"}`
3. 后端查 user_oauth 表：
   - 已绑定 → 返回对应 user 的 JWT
   - 未绑定 → 自动创建 user（用户名用 "feishu_ou_xxx"）+ user_oauth 绑定 + user_settings 默认值 → 返回 JWT
4. 后续 Javis 用该 JWT 调用其他 API

### 权限控制

| 角色 | 权限范围 |
|------|---------|
| admin | 管理用户（创建/禁用/启用）、查看所有统计数据、所有 user 权限 |
| user | 仅操作自己的数据（accounts, categories, transactions, subscriptions, settings） |

- 后端中间件：每个请求从 JWT 提取 user_id，注入请求上下文
- 数据隔离：所有查询强制加 `WHERE user_id = :current_user_id`（admin 管理用户接口除外）
- 前端路由守卫：/users 页面仅 admin 可访问

---

## API 设计

所有接口前缀 `/api/v1/`。请求体和响应体均为 JSON。

### 通用响应格式

```json
// 成功
{ "success": true, "data": { ... } }

// 失败
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "具体错误信息" } }

// 分页列表
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

### 认证相关

#### POST /api/v1/auth/login

公开接口。

请求体：
```json
{ "username": "zhangsan", "password": "MyPassword123" }
```

响应：
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": {
      "id": 1,
      "username": "zhangsan",
      "role": "admin",
      "is_active": true,
      "force_change_password": false
    }
  }
}
```

- is_active 为 FALSE 时返回 403
- force_change_password 为 TRUE 时前端应跳转到修改密码页
- 同时 Set-Cookie

#### POST /api/v1/auth/auto-register

公开接口，Javis 专用。飞书 open_id 自动注册或获取已有用户。

请求体：
```json
{ "provider": "feishu", "provider_uid": "ou_xxxxxxxxxxxxxx" }
```

响应：
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "user": {
      "id": 2,
      "username": "feishu_ou_xxxxxxxxxxxxxx",
      "role": "user",
      "is_active": true
    },
    "is_new_user": true
  }
}
```

- is_new_user: 告知 Javis 是否为新注册用户，方便 Javis 回复不同消息

#### POST /api/v1/auth/logout

需要认证。清除 Cookie。

响应：
```json
{ "success": true }
```

#### GET /api/v1/auth/me

需要认证。返回当前用户信息。

响应：
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "zhangsan",
    "role": "admin",
    "is_active": true,
    "feishu_bound": true
  }
}
```

- feishu_bound: 是否已绑定飞书
- force_change_password: 是否需要修改密码

---

### 密码修改

#### PUT /api/v1/users/me/password

---

### 用户管理（仅 admin）

> 注意：不开放公开注册。所有用户由管理员创建。

#### GET /api/v1/users

需要 admin 角色。获取用户列表。

查询参数：`?page=1&page_size=20&search=zhang`

响应：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "username": "zhangsan",
        "role": "admin",
        "is_active": true,
        "feishu_bound": true,
        "created_at": "2026-03-28T08:00:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "page_size": 20
  }
}
```

#### POST /api/v1/users

需要 admin 角色。手动创建用户。

请求体：
```json
{
  "username": "lisi",
  "password": "Password123",
  "role": "user",
  "feishu_open_id": "ou_xxxxxxxxxxxxxx"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "id": 3,
    "username": "lisi",
    "role": "user",
    "is_active": true,
    "force_change_password": true
  }
}
```

- feishu_open_id 可选。传了则同时创建 user_oauth 绑定
- force_change_password 默认 TRUE，用户首次登录需修改密码

#### PUT /api/v1/users/:id/toggle-active

需要 admin 角色。启用或禁用用户。

请求体：
```json
{ "is_active": false }
```

响应：
```json
{ "success": true }
```

- 禁用后该用户无法登录
- 不能禁用自己

---

### 用户设置

#### GET /api/v1/users/me/settings

需要认证。获取当前用户的设置。

响应：
```json
{
  "success": true,
  "data": {
    "default_needs_confirm": true,
    "confirm_rules": [
      {"category": "餐饮", "max_amount": 5000, "needs_confirm": false}
    ]
  }
}
```

#### PUT /api/v1/users/me/settings

需要认证。更新用户设置（部分更新）。

请求体：
```json
{
  "default_needs_confirm": false,
  "confirm_rules": [
    {"category": "餐饮", "max_amount": 5000, "needs_confirm": false},
    {"category": "交通", "max_amount": 3000, "needs_confirm": false}
  ]
}
```

响应：
```json
{
  "success": true,
  "data": {
    "default_needs_confirm": false,
    "confirm_rules": [
      {"category": "餐饮", "max_amount": 5000, "needs_confirm": false},
      {"category": "交通", "max_amount": 3000, "needs_confirm": false}
    ]
  }
}
```

#### PUT /api/v1/users/me/password

需要认证。修改密码。

请求体：
```json
{
  "old_password": "OldPassword123",
  "new_password": "NewPassword456"
}
```

响应：
```json
{ "success": true }
```

---

### 飞书绑定管理

#### POST /api/v1/users/me/bind-feishu

需要认证。当前用户绑定飞书 open_id。

请求体：
```json
{ "feishu_open_id": "ou_xxxxxxxxxxxxxx" }
```

响应：
```json
{ "success": true }
```

- 该 open_id 已被其他用户绑定时返回 409

#### DELETE /api/v1/users/me/bind-feishu

需要认证。解除飞书绑定。

响应：
```json
{ "success": true }
```

---

### 自然语言记账（Javis 集成）

#### POST /api/v1/transactions/parse

需要认证。解析自然语言为结构化交易数据，不写入数据库。

请求体：
```json
{ "text": "中午吃红烧肉19块" }
```

响应：
```json
{
  "success": true,
  "data": {
    "amount": 1900,
    "type": "expense",
    "category": "餐饮",
    "subcategory": null,
    "account": "微信",
    "note": "中午吃红烧肉",
    "date": "2026-03-28",
    "confidence": 0.92,
    "needs_confirm": true
  }
}
```

- amount: 单位分
- confidence: 解析置信度 0-1，低于 0.6 时前端/Javis 提示用户确认
- needs_confirm: 根据用户设置中的 confirm_rules 计算（MVP 默认 TRUE）
- account: 根据用户常用账户推断，无常用账户时返回 null
- date: 默认今天，文本中有明确日期时解析
- LLM 调用在后端完成，前端/Javis 不直接调 LLM

#### POST /api/v1/transactions/parse-confirm

需要认证。确认并写入 parse 返回的交易数据。

请求体：
```json
{
  "amount": 1900,
  "type": "expense",
  "category": "餐饮",
  "account": "微信",
  "note": "中午吃红烧肉",
  "date": "2026-03-28"
}
```

响应：
```json
{
  "success": true,
  "data": {
    "id": 42,
    "user_id": 1,
    "type": "expense",
    "amount": 1900,
    "category": "餐饮",
    "account": "微信",
    "note": "中午吃红烧肉",
    "date": "2026-03-28",
    "needs_confirm": false,
    "confirmed_at": "2026-03-28T08:30:00Z",
    "created_at": "2026-03-28T08:30:00Z"
  }
}
```

- 写入时 needs_confirm 设为 FALSE，confirmed_at 设为当前时间（用户已确认）
- 后端根据 category name 查找 category_id，account name 查找 account_id
- 如果分类或账户不存在，返回 404 并提示

---

### 交易 CRUD

#### GET /api/v1/transactions

需要认证。分页列表。

查询参数：`?page=1&page_size=20&type=expense&category_id=1&account_id=1&start_date=2026-03-01&end_date=2026-03-31&search=红烧肉`

响应：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": 42,
        "type": "expense",
        "amount": 1900,
        "category": "餐饮",
        "account": "微信",
        "note": "中午吃红烧肉",
        "date": "2026-03-28",
        "needs_confirm": false,
        "created_at": "2026-03-28T08:30:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

#### POST /api/v1/transactions

需要认证。手动创建交易（Web 端使用）。

请求体：
```json
{
  "type": "expense",
  "amount": 1900,
  "category_id": 1,
  "account_id": 1,
  "to_account_id": null,
  "date": "2026-03-28",
  "note": "中午吃红烧肉"
}
```

响应：返回创建的 transaction 对象。

- Web 端手动录入：needs_confirm 默认 FALSE（用户主动操作无需二次确认）

#### PUT /api/v1/transactions/:id

需要认证。更新交易。

请求体（部分更新）：
```json
{ "amount": 2500, "note": "午饭加了饮料" }
```

#### DELETE /api/v1/transactions/:id

需要认证。软删除。

响应：
```json
{ "success": true }
```

---

### 待确认交易

#### GET /api/v1/transactions/pending

需要认证。获取待确认的交易列表（needs_confirm=TRUE 且 confirmed_at IS NULL）。

查询参数：`?page=1&page_size=20`

响应格式同交易列表。

#### POST /api/v1/transactions/:id/confirm

需要认证。确认一条待确认交易。

响应：
```json
{
  "success": true,
  "data": {
    "id": 42,
    "confirmed_at": "2026-03-28T08:35:00Z"
  }
}
```

#### POST /api/v1/transactions/:id/reject

需要认证。拒绝一条待确认交易（软删除）。

响应：
```json
{ "success": true }
```

---

### 账户管理

#### GET /api/v1/accounts
#### POST /api/v1/accounts
#### PUT /api/v1/accounts/:id
#### DELETE /api/v1/accounts/:id

标准 CRUD，所有接口需要认证，自动按 user_id 隔离。

POST 请求体：
```json
{
  "name": "招商银行",
  "type": "bank",
  "balance": 5000000,
  "icon": "landmark",
  "sort_order": 0
}
```

---

### 分类管理

#### GET /api/v1/categories

需要认证。返回树形分类列表。

响应：
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "餐饮",
      "type": "expense",
      "icon": "utensils",
      "color": "#ea4335",
      "sort_order": 0,
      "children": [
        { "id": 2, "name": "外卖", "type": "expense", "icon": null, "color": null, "sort_order": 0, "children": [] }
      ]
    }
  ]
}
```

#### POST /api/v1/categories
#### PUT /api/v1/categories/:id
#### DELETE /api/v1/categories/:id

标准 CRUD。DELETE 时级联删除子分类。

---

### 订阅管理

#### GET /api/v1/subscriptions
#### POST /api/v1/subscriptions
#### PUT /api/v1/subscriptions/:id
#### DELETE /api/v1/subscriptions/:id

标准 CRUD。

#### GET /api/v1/subscriptions/upcoming

需要认证。获取即将到期的订阅（next_date 在未来 7 天内）。

---

### 报表统计

#### GET /api/v1/reports/monthly

需要认证。

查询参数：`?year=2026&month=3`

响应：
```json
{
  "success": true,
  "data": {
    "total_income": 2000000,
    "total_expense": 850000,
    "net": 1150000,
    "by_category": [
      {"category": "餐饮", "amount": 300000, "count": 25},
      {"category": "交通", "amount": 150000, "count": 10}
    ]
  }
}
```

#### GET /api/v1/reports/trend

需要认证。

查询参数：`?months=6`

响应：
```json
{
  "success": true,
  "data": {
    "months": ["2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"],
    "income": [1500000, 1600000, 1700000, 1800000, 1900000, 2000000],
    "expense": [800000, 750000, 900000, 850000, 800000, 850000]
  }
}
```

---

## 页面结构

### 页面清单

| 路径 | 页面 | 权限 | 说明 |
|------|------|------|------|
| /login | 登录页 | 公开 | 用户名+密码登录 |
| /change-password | 修改密码 | 登录 | 首次登录强制修改 / 主动修改 |
| /dashboard | 仪表盘 | 登录 | 本月收支/净资产/快捷记账/近期交易/订阅提醒 |
| /transactions | 交易列表 | 登录 | 筛选、搜索、分页 |
| /transactions/new | 新增交易 | 登录 | 手动录入表单 |
| /accounts | 账户管理 | 登录 | 账户卡片+余额 |
| /categories | 分类管理 | 登录 | 树形展示 |
| /reports | 月度报表 | 登录 | 饼图+柱状图+趋势 |
| /subscriptions | 订阅管理 | 登录 | 列表+即将到期 |
| /settings | 个人设置 | 登录 | 修改密码、确认策略、飞书绑定 |
| /users | 用户管理 | admin | 用户列表、创建、禁用/启用 |

### 布局

桌面端：左侧 Sidebar 导航（240px）+ 右侧内容区
移动端：底部 Tab 导航（仪表盘/记账/报表/我的）

### 导航菜单

桌面端 Sidebar：
- 仪表盘
- 交易
- 账户
- 分类
- 报表
- 订阅
- ---（分隔线）
- 用户管理（仅 admin 可见）
- 设置

移动端底部 Tab：
- 仪表盘
- 记账（快捷入口，跳转 /transactions/new）
- 报表
- 我的（展开：设置、用户管理（admin））

---

## 飞书集成架构

### Javis 调用流程

```
用户飞书消息 → Javis → POST /api/v1/auth/auto-register（获取/创建用户+JWT）
                     ↓
              POST /api/v1/transactions/parse（自然语言解析）
                     ↓
              检查 needs_confirm
              ├─ TRUE  → 返回解析结果给用户确认 → 用户确认 → POST /api/v1/transactions/parse-confirm
              └─ FALSE → 直接 POST /api/v1/transactions/parse-confirm（自动写入）
```

### 确认策略判定逻辑

后端 parse 接口内部判定 needs_confirm：

```
function checkNeedsConfirm(user_settings, parsed_data):
    if not user_settings.default_needs_confirm:
        return false
    
    for rule in user_settings.confirm_rules:
        if rule.category == parsed_data.category:
            if parsed_data.amount <= rule.max_amount:
                return rule.needs_confirm
    
    return true  // 默认需要确认
```

### LLM 调用设计

- Provider: 智谱 GLM（与 Javis 主力模型一致，减少供应商数量）
- Prompt: 系统提示词包含用户的所有分类列表和账户列表，要求 LLM 从中匹配
- 超时: 10 秒
- 降级: LLM 超时或失败时返回 500 + 友好提示，不写入任何数据
- 不流式: 记账解析不需要流式输出，等完整结果返回

---

## 项目目录结构

```
finance-app/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置（环境变量）
│   │   ├── database.py          # PostgreSQL 连接
│   │   ├── auth/
│   │   │   ├── jwt.py           # JWT 签发/验证
│   │   │   ├── deps.py          # 依赖注入（get_current_user）
│   │   │   └── router.py        # 认证路由
│   │   ├── models/
│   │   │   ├── user.py          # User ORM
│   │   │   ├── account.py
│   │   │   ├── category.py
│   │   │   ├── transaction.py
│   │   │   └── subscription.py
│   │   ├── schemas/             # Pydantic 请求/响应模型
│   │   ├── routers/
│   │   │   ├── users.py         # 用户管理（admin）
│   │   │   ├── accounts.py
│   │   │   ├── categories.py
│   │   │   ├── transactions.py  # 含 parse/parse-confirm
│   │   │   ├── subscriptions.py
│   │   │   ├── reports.py
│   │   │   └── settings.py      # 用户设置
│   │   ├── services/
│   │   │   ├── auth_service.py  # 登录/注册/自动注册
│   │   │   ├── nlp_service.py   # LLM 自然语言解析
│   │   │   └── confirm_service.py # 确认策略判定
│   │   └── middleware/
│   │       └── auth.py          # JWT 认证中间件
│   ├── migrations/              # Alembic 迁移
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── ChangePassword.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Transactions.tsx
│   │   │   ├── TransactionForm.tsx
│   │   │   ├── Accounts.tsx
│   │   │   ├── Categories.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── Subscriptions.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── Users.tsx        # admin 专属
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   └── ...
│   │   ├── hooks/
│   │   ├── api/
│   │   └── lib/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── .javis/
    ├── prd.md
    ├── architecture.md
    └── design.md
```

---

## 安全考虑

1. 密码：bcrypt 哈希，cost factor 12
2. JWT 密钥：环境变量注入，不硬编码
3. SQL 注入：使用 SQLAlchemy ORM 参数化查询
4. XSS：前端 React 默认转义，后端不渲染 HTML
5. CORS：仅允许前端域名
6. Rate Limit：登录接口 5 次/分钟/IP
7. 数据隔离：中间件强制注入 user_id，不允许跳过
