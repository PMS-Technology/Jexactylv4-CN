# Jexactyl Svelte Edition — 阶段一：代码审计报告

> 本文档基于实际仓库内容生成，非推测。统计时间：仓库 `develop` 分支，HEAD `5927ca45f`。

## 1. 项目身份

这不是上游 Pterodactyl，也不是标准 Jexactyl v3。实际代码库是 **Everest / Jexactyl v4.0.0dev**：

- `package.json` name: `@jexactyl/jexactyl`, version `4.0.0dev`
- PHP 命名空间为 `Everest\`（非 `Pterodactyl\`）
- 前端运行时实际是 **Preact 10**（通过 `vite.config.ts` 的 alias 把 `react` → `preact/compat`），而非真正的 React 18
- 已包含大量上游不存在的自研模块：计费、工单、AI、主题、告警、Webhook、管理员角色权限、服务器预设、Passkey

## 2. 规模统计（实测）

| 项目 | 数量 |
|---|---|
| 前端源码总行数 | **45,740** 行 |
| `.tsx` 文件 | 391 |
| `.ts` 文件 | 147 |
| `components/` 下组件 | 287 |
| 页面级容器（`*Container.tsx` / `*Router.tsx`） | 104 |
| `elements/` 共享组件 | 86 |
| 客户端 API 封装文件 | 73 |
| Laravel `api-client.php` 路由 | 105 |
| Laravel `api-application.php` 路由 | 137 |
| 状态 store 文件 | 26 |

基线验证：`pnpm install` 成功，`pnpm build` 成功（28.5s），产物最大 chunk `vendor-react` 391 kB。

## 3. 当前技术栈

**前端**：Preact 10（伪装成 React 18）、react-router-dom 6.8、easy-peasy 5（状态）、styled-components 5 + twin.macro（CSS-in-JS）、Tailwind 3.2、Formik 2 + Yup（表单）、SWR 2（数据）、framer-motion 9（动画）、Chart.js 3（图表）、xterm 5（终端）、CodeMirror 6（编辑器）、Heroicons v1 + FontAwesome 6（图标）、i18next（国际化）、axios 0.33。

**构建**：Vite 4.5 + `laravel-vite-plugin` 0.7，入口 `resources/scripts/index.tsx`，输出 `public/build`。TypeScript 4.9，已开启 `strict`。手动 `manualChunks` 分包。Brotli/Gzip 压缩已启用。

**环境**：Node v22.20.0、pnpm 9.0.6（`packageManager` 已锁定）、npm 10.9.3。Composer 依赖已安装。

## 4. 应用启动与认证流程（关键约束）

这是整个迁移最重要的约束。前端**不是**独立 SPA，而是由 Laravel Blade 注入引导数据：

```
routes/base.php  →  Base\IndexController@index  →  view('templates/base.core')
                                                      ↓ extends templates/wrapper
```

`resources/views/templates/wrapper.blade.php` 在 `<head>` 中注入四个全局变量：

| 全局变量 | 来源 | 消费方 |
|---|---|---|
| `window.PterodactylUser` | `Auth::user()->toReactObject()` | `state/user.ts` |
| `window.SiteConfiguration` | `$siteConfiguration` | `state/settings.ts` |
| `window.EverestConfiguration` | `$everestConfiguration` | `state/everest.ts`（功能开关） |
| `window.ThemeConfiguration` | `$themeConfiguration` | `state/theme.ts` |

同时注入 `<meta name="csrf-token">`，并用 `@vite('resources/scripts/index.tsx')` 加载前端。

**认证机制**：Laravel Session + Cookie。`api/http.ts` 是 axios 实例，`withCredentials: true`，无 token 逻辑。登录走 `POST /auth/login`（Blade 路由，非 API），支持两步验证 checkpoint、Passkey（WebAuthn）、Discord/Google SSO、ReCAPTCHA。

**后果**：`EverestConfiguration` 等开关在首屏同步可用，路由表的 `condition` 回调直接依赖它。新前端必须保留这套注入契约，不能改成异步请求，否则路由与侧边栏会闪烁。

## 5. 路由结构

`components/App.tsx` 顶层四分支（BrowserRouter）：

| 路径 | Router | 说明 |
|---|---|---|
| `/auth/*` | `AuthenticationRouter` | 登录/注册/找回密码/2FA checkpoint |
| `/server/:id/*` | `ServerRouter` | 包裹 `ServerContext.Provider` |
| `/admin/*` | `AdminRouter` | 包裹 `AdminContext.Provider` |
| `/*` | `DashboardRouter` | 用户控制台 |

App.tsx 还有三个前置拦截：`state === 'suspended'` 显示封禁提示；`root_admin && !setup` 进入 `SetupContainer` 安装向导；用户名以 `null_user_` 开头且开启 onboarding 时进入 `Onboarding`。

路由表集中在 `routers/routes/{account,server,admin}.ts`，由 `routers/routes/utils.ts` 的 `route()` 工厂声明，带元数据：`name`、`icon`、`category`、`permission`、`condition`、`end`。侧边栏由同一份数据驱动。这套设计可以几乎原样移植到 Svelte。

### 用户控制台路由（`routes/account.ts`）
`/`（Dashboard）、`/account`（概览）、`/account/security/*`（含 API 密钥、SSH、Passkey 三个 tab，旧路径 `api`/`ssh`/`passkeys` 已重定向）、`/account/tickets`、`/account/tickets/:id`、`/account/billing/order`、`/account/billing/order/:id`、`/account/billing/orders`、`/account/billing/{processing,success,cancel}`。

注：该文件的 `name` 字段已被改为中文（账号/安全/工单/订购服务/订单），属未提交改动。

### 服务器路由（`routes/server.ts`）
Console、Files（+ 编辑器）、Databases、Schedules（+ 编辑）、Users、Backups、Network、Startup、Activity、Billing、Billing/Upgrade。每条带 `permission`（如 `file.*`）与 `category`（general/data/configuration）。

### 管理端路由（`routes/admin.ts`）
- **general**：Overview、Activity、Settings、Settings/Webhooks、API
- **modules**：Auth、Billing、Tickets、AI
- **appearance**：Theme、Links、Alerts
- **management**：Databases、Nodes（+new/:id）、Servers（+new/presets/:id）、Users（+new/:id/roles）
- **services**：Nests、Eggs（含变量、安装脚本、导入导出）

每条带 `permission`（如 `nodes.read`）与 `advanced` 标记。

## 6. 状态管理

easy-peasy 全局 store（`state/index.ts`）：`user`、`theme`、`flashes`、`everest`、`settings`、`progress`、`permissions`。

两个 context store：
- `ServerContext`（`state/server/index.ts`）：server 数据、status、socket、databases、files、schedules、subusers、permissions。含 `inConflictState`、`isInstalling` 计算属性。
- `AdminContext`（`state/admin/index.ts`）：nodes、servers、users、roles、nests、databases、allocations、mounts、tickets、api。

迁移目标：改为 Svelte 5 Runes（`$state`/`$derived`），服务端数据交给 TanStack Svelte Query，context store 改为 Svelte context + runes 类。

## 7. 实时通信（必须完整保留）

`plugins/Websocket.ts`：基于 Sockette 的 `EventEmitter` 子类。

- Token 通过 `GET /api/client/servers/{server}/websocket` 获取，返回 `{ token, socket }`
- 连接后发送 `{ event: 'auth', args: [token] }`
- Token 15 分钟过期，服务端在 3 分钟和 0 分钟时推送 `token expiring` / `token expired`
- 关闭码 **4409**（服务器被暂停）和 **4400**（预留）必须中止重连，不能走 sockette 默认重连
- 消息格式：`{ event, args }`

消费方：`components/server/WebsocketHandler.tsx`、`InstallListener.tsx`、`TransferListener.tsx`、`plugins/useWebsocketEvent.ts`、console、StatGraphs。

这套协议与 Wings 对接，**不能改动**。

## 8. 文件管理与终端

- **文件管理**：`components/server/files/` 15 个组件。列表/网格双视图、排序、批量操作、chmod、重命名、上传（直传 Wings，带签名 URL）、下载、压缩/解压。`plugins/useFileManagerSwr.ts` 封装 SWR 缓存。
- **编辑器**：CodeMirror 6，按语言动态加载（14 个 lang 包）。构建产物 380 kB，已单独分包。
- **终端**：xterm 5 + fit/search/search-bar/web-links addon，另有自研 `XtermScrollDownHelperAddon.ts`。构建产物 296 kB。

## 9. Jexactyl / Everest 扩展功能清单（不得遗漏）

**计费**：商品分类（Category）、商品（Product）、订单（Order）、发票（Invoice，含 PDF Blade 模板 `views/invoices/pdf.blade.php`）、优惠码（Discount Code）、Stripe 支付、续费（RenewalDates）、服务器升级（Upgrade）、计费异常（Exceptions）、营收图表、配置导入导出、节点计费配置。

**工单**：用户端创建/查看/回复/删除，管理端列表/查看/消息表/用户选择器，开关与选项配置。

**AI**：管理端开关、配置、概览、设置；服务器端 `IntelligenceButton`（控制台 AI 辅助）。

**认证模块**：Discord SSO、Google SSO、JGuard、Onboarding、注册开关、强制 2FA、登录尝试限制。

**其他**：主题编辑器（颜色选择 + 实时预览）、自定义导航链接（Links）、全站告警横幅（Alerts，含类型与位置）、Webhook（事件表 + 开关）、管理员角色与细粒度权限（`plugins/adminPermissions.ts`，支持 `users.*` 通配）、服务器预设（Presets）、服务器分组（account/groups）、Passkey（WebAuthn，`@simplewebauthn/browser`）、安装向导（setup，含迁移检查）、SpeedDial 快捷操作、全局搜索（SearchModal）、服务器功能弹窗（EULA、Java 版本、GSL Token、PID 限制、Steam 磁盘、Hytale OAuth）。

## 10. 关键兼容性风险

1. **Tailwind 3 → 4 不能全局升级**。现有 287 个组件依赖 `twin.macro` + styled-components，twin.macro 读取 `tailwind.config.js`（Tailwind 3 格式）。Tailwind 4 改为 CSS-first 配置，两者无法共存于同一 PostCSS 管线。**结论**：新 Svelte 应用必须使用独立的 Vite 配置和独立的 PostCSS 管线，与旧应用物理隔离。

2. **SvelteKit 不适用**。SvelteKit 要求掌管 HTML 外壳与路由，而本项目的 HTML 由 Laravel Blade 生成并注入 4 个全局引导变量，且由 `routes/base.php` 的 catch-all 转发。强行引入 SvelteKit 需要重写后端渲染层，与"不重写 Laravel 后端"的要求冲突。**结论**：采用 **Svelte 5 + Vite 纯 SPA**，配合客户端路由，继续由 `laravel-vite-plugin` 接管资源注入。这也符合任务书第五节"如果当前项目更适合 Vite SPA，也可以采用 Svelte + Vite，不要为了使用 SvelteKit 而增加不必要的架构复杂度"。

3. **图标体系变更**。现用 Heroicons v1（`@heroicons/react/outline`）+ FontAwesome 6，路由表直接存放 React 图标组件。迁移到 Lucide 需要逐个映射图标名，且路由表的 `icon` 字段类型要改为 Svelte 组件。Heroicons v1 有部分图标在 Lucide 中无同名对应，需人工决定替代。

4. **表单栈变更**。Formik + Yup（现有 ~60 处表单）→ Zod + Svelte 5。无自动迁移路径，必须逐个重写并保持校验规则一致。

5. **Preact 残留**。`vite.config.ts` 的 alias 把 react 指向 preact/compat。清理旧前端时需同时移除 `@preact/preset-vite` 与这些 alias。

6. **已有未提交改动**。工作区有 9 个已修改文件和 2 个未跟踪文件（`database/Seeders/DemoDataSeeder.php`、`resources/lang/zh/`），包含中文化改动。迁移不应覆盖这些。

## 11. 架构决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 框架 | Svelte 5（Runes） | 任务要求 |
| 路由 | 客户端 SPA 路由（非 SvelteKit） | Blade 注入引导数据 + Laravel catch-all，见风险 2 |
| 构建 | 独立 `vite.svelte.config.ts`，独立 PostCSS | Tailwind 4 与 twin.macro 不可共存，见风险 1 |
| 输出目录 | `public/build-svelte` | 与旧产物隔离，两套前端可并行存在 |
| 引导数据 | 继续读 `window.*` 四变量 | 保持后端契约不变 |
| 认证 | 继续 Session + Cookie + CSRF meta | 不引入 token |
| 数据层 | TanStack Svelte Query 包装现有 axios 封装 | 复用 73 个 API 文件的 transformer 逻辑 |
| 渐进式切换 | Blade 中按开关选择加载哪套前端 | 每阶段均可构建、可回滚 |

## 12. 迁移清单状态

见 `MIGRATION_PLAN.md`（阶段二起的逐页清单与进度跟踪）。
