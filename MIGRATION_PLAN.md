# Jexactyl Svelte Edition — 迁移计划与进度

审计结论见 `MIGRATION_AUDIT.md`。本文档跟踪逐页迁移进度。

## 架构

两套前端并行存在，由 `config/app.php` 的 `frontend` 开关 + 路由白名单选择：

```
APP_FRONTEND=legacy  （默认）  所有路由 → templates/base.core  → public/build        （Preact）
APP_FRONTEND=svelte           白名单路由 → templates/svelte.core → public/build-svelte （Svelte 5）
                              其余路由   → templates/base.core  → public/build        （Preact）
```

白名单在 `Everest\Http\Controllers\Base\IndexController::template()` 中维护。**每迁移完一页，才把对应路径加进白名单**，因此任何时刻两套前端都是可构建、可运行的，且可通过改一个环境变量整体回滚。

目录：Svelte 应用完全独立在 `frontend/`，有自己的 `package.json`、`node_modules`、Vite 配置和 PostCSS 管线。原因见审计报告风险 1（Tailwind 4 与 twin.macro 无法共存）。

开发时两个 Vite dev server 可同时运行：旧应用用 `public/hot`（端口 5173），新应用用 `public/hot-svelte`（端口 5174）。

## 阶段进度

| 阶段 | 状态 |
|---|---|
| 一、代码审计 | **完成** |
| 二、基础工程（Svelte 5 + TS + Vite + Tailwind 4 + Laravel 集成） | **完成** |
| 三、基础功能（布局、主题、路由、认证、API 客户端、权限） | **完成** |
| 四、用户端迁移 | **完成** |
| 五、管理端迁移 | **完成** |
| 六、实时功能（WebSocket / 终端 / 文件） | **完成** |
| 七、功能验证 | **进行中**（迁移期逐模块浏览器验证已完成；阶段七针对真实环境整体走查） |
| 八、清理旧前端 | 未开始 |

## 已迁移页面

| 路由 | 页面 | API | 状态 |
|---|---|---|---|
| `/` | 服务器列表（搜索、管理员"显示全部"、分页信息、全局搜索弹窗、服务器分组） | `GET /api/client`、`/api/client/groups*` | 完成 |
| `/account` | 账号概览（信息、改邮箱、改密码） | `PUT /api/client/account/email`、`PUT /api/client/account/password` | 完成 |
| `/account/security` | 安全中心·凭据（2FA 启用/停用 + 恢复码、改邮箱、改密码） | `GET/POST /api/client/account/two-factor`、`POST …/two-factor/disable` | 完成 |
| `/account/security/passkeys` | Passkey 列表、添加（WebAuthn 注册）、移除 | `/api/client/account/passkeys{,/options,/remove}` | 完成（注册仪式未在真实认证器上验证） |
| `/account/security/ssh` | SSH 密钥列表、添加、删除 | `/api/client/account/ssh-keys{,/remove}` | 完成 |
| `/account/security/api` | API 密钥列表、创建（一次性显示 token）、删除 | `/api/client/account/api-keys` | 完成 |
| `/account/api`、`/account/ssh`、`/account/passkeys` | 旧书签重定向 → `/account/security/*` | — | 完成（客户端跳转） |
| `/account/tickets` | 工单列表、创建（含数量上限提示） | `GET/POST /api/client/account/tickets` | 完成（受 `tickets.enabled` 控制） |
| `/account/tickets/:id` | 工单详情、回复、删除 | `GET/DELETE /api/client/account/tickets/{id}`、`POST …/{id}/messages` | 完成 |
| `/account`（头像卡片） | 头像：链接设置、文件上传、移除恢复默认 | `POST/DELETE /api/client/account/avatar` | 完成 |
| `/account/billing/order` | 套餐列表（按分类） | `GET /api/client/billing/categories{,/:id}` | 完成（受 `billing.enabled` 控制；无 Stripe 密钥时显示“商店暂不可用”） |
| `/account/billing/order/:id` | 下单：节点、egg、变量、条款、优惠码、付费跳转 Stripe / 免费直接部署 | `…/products/:id{,/eggs}`、`POST …/nodes/:id`、`…/products/{egg}/variables`、`POST …/discount-codes`、`POST …/stripe/create`、`POST …/free/process` | 完成（付费流程只验证到创建 Checkout 请求，未接真实 Stripe） |
| `/account/billing/orders` | 统计卡片、订单表（搜索、排序、分页）、发票下载 | `GET /api/client/billing/orders`、`…/orders/:id/invoice` | 完成（发票下载未在真实发票上验证） |
| `/account/billing/processing`、`/success`、`/cancel` | Stripe 回跳页面 | `POST /api/client/billing/stripe/process` | 完成 |
| 全站（前置拦截） | Onboarding 引导（SSO 注册账号设置用户名/密码，替代整页） | `POST /api/client/account/setup` | 完成 |
| `/auth/login`、`/auth/login/checkpoint`、`/auth/register`、`/auth/password`、`/auth/password/reset/:token` | 登录（用户名或邮箱、通行密钥、Discord/Google SSO、注册入口）、两步验证（验证码 / 恢复码，也接受 SSO 跳转带来的 `?token=`）、注册（受 `registration.enabled` 控制）、用恢复码重置密码、邮件链接重置密码；访客访问其他页面时先跳到登录页，登录后回到原页面 | `POST /auth/login`、`/auth/login/checkpoint`、`/auth/passkey/{options,login}`、`/auth/register`、`/auth/modules/{discord,google}`、`/auth/password`、`/auth/password/reset` | 完成（`features/auth/`，懒加载；reCAPTCHA 用 `$lib/utils/recaptcha.ts`，加载超过 15 秒报错。与旧版的差异：注册后自动登录被拒时跳到登录页并说明原因，旧版一直转圈；用恢复码重置成功后直接登录或提示重新登录，旧版显示空白成功消息；SSO 失败的错误能显示出来。后端修复：`/auth/password` 对不存在的邮箱返回 404，暴露哪些邮箱已注册，现在和恢复码错误一样返回 400；两步验证账号重置后返回 JSON 而不是重定向；reCAPTCHA 校验失败时 `FailedCaptcha` 的 hostname 为 null 导致 500；向 Google 校验没有超时，Google 不可达时请求一直挂起并占住 PHP 进程，现在 5 秒连接 / 10 秒总超时。已用浏览器验证：错误密码、登录、TOTP 两步验证（错误码 / 正确码）、恢复码登录且用后作废、两步验证页刷新回到登录页、注册（密码不一致、重复邮箱）、恢复码重置（未知邮箱和错误码同为 400、两步验证账号提示重新登录、普通账号直接登录）、邮件链接重置及链接复用被拒、访客跳转登录并回到原页面、退出登录、reCAPTCHA 失败提示。未验证：真实 reCAPTCHA 通过（本机 PHP 访问不到 Google）、通行密钥登录（WebAuthn 不接受 IP 地址作 RP ID）、Discord/Google SSO（未配置）） |
| 全站（前置拦截） | 安装向导（root 管理员、面板未完成设置时替代整页） | `GET /api/application/setup/data`、`POST …/setup/finish`、`PUT /api/application/theme/colors`、`PATCH /api/application/settings/mode` | 完成 |
| `/server/:id/databases` | 数据库列表、创建、连接详情（含密码与 JDBC 串）、轮换密码、输入名称确认删除 | `/api/client/servers/:id/databases{,/:db/rotate-password}` | 完成 |
| `/server/:id/backups` | 备份列表（分页）、创建（含锁定）、下载、恢复（可选清空文件）、锁定/解锁、删除；`backup completed:<uuid>` 实时更新 | `/api/client/servers/:id/backups{,/:uuid/download,/lock,/restore}` | 完成（下载签名 URL、`backup completed` 事件未用真实 Wings 验证） |
| `/server/:id/schedules`、`/schedules/:id` | 计划任务列表、创建/编辑（cron + 速查表）、详情页任务增删改、立即运行、删除 | `/api/client/servers/:id/schedules{,/:id,/execute,/tasks}` | 完成 |
| `/server/:id/users` | 子用户列表、邀请、权限矩阵编辑（只能授予自己拥有的权限）、移除 | `/api/client/permissions`、`/api/client/servers/:id/users` | 完成 |
| `/server/:id/network` | 分配列表、新建、备注（750 ms 防抖保存）、设为主分配、删除 | `/api/client/servers/:id/network/allocations` | 完成 |
| `/server/:id/startup` | 启动命令、Docker 镜像切换、变量（开关 / 下拉 / 文本，500 ms 防抖保存） | `/api/client/servers/:id/startup{,/variable}`、`…/settings/docker-image` | 完成 |
| `/server/:id/activity` | 活动日志（中文描述、事件 hash 筛选、分页、元数据弹窗） | `GET /api/client/servers/:id/activity?include=actor` | 完成（受 `activity.enabled.server` 控制） |
| `/server/:id/billing`、`/billing/upgrade` | 服务器计费（概览、订单、免费/付费续期）、升级（差价确认 → Stripe） | `…/billing/products/:id`、`…/billing/orders?filter[server_id]`、`…/free/process`、`…/stripe/create`、`/api/client/servers/:id/upgrade{,/charge}` | 完成（Stripe 未接真实密钥） |

## 用户端待迁移清单

- [x] `/account/security/*` — 安全中心（2FA、API 密钥、SSH 密钥、Passkey 四个 tab）
- [x] `/account/tickets`、`/account/tickets/:id` — 工单（受 `tickets.enabled` 控制）
- [x] `/account/billing/order`、`/billing/order/:id`、`/billing/orders`、`/billing/{processing,success,cancel}` — 计费（受 `billing.enabled` 控制）
- [x] 头像上传/修改（API 已移植：`$lib/api/account.ts`；beam 生成头像算法逐字移植自 boring-avatars，已用脚本对比验证输出一致）
- [x] 全局搜索 SearchModal（侧边栏入口 + ⌘/ 快捷键；`/server/*` 仍在旧壳，结果为整页跳转）
- [x] 服务器分组（ServerGroup）（管理弹窗 + 卡片徽章 + 加入/移出；API `$lib/api/groups.ts`）
- [x] Onboarding 引导流程（`null_user_` 占位账号全屏拦截弹窗；`POST /api/client/account/setup`；成功后跳登录页。已用测试账号完整验证：校验、提交、数据库更新、强制登出）
- [x] DashboardAlert 全站告警横幅（四种位置：top-center 横幅 / bottom-left、bottom-right 悬浮胶囊 / center 弹窗；center 关闭状态按 `alert_{uuid}_{user}` 持久化，与旧前端同键互通；uuid 更换后重新弹出。已四种位置逐一浏览器验证）

- [x] 移动端侧边栏（`<md` 隐藏桌面侧栏，底部固定导航条：Home、账号路由、管理员入口、搜索图标入口；主区 `pb-16` 预留；DashboardAlert 底部胶囊移动端抬高至 `bottom-20` 避让。已 390/360px 视口 + 管理员/普通账号浏览器验证）
- [x] SpeedDial 管理员快捷操作（`app.isAdmin && settings.speed_dial` 双条件渲染；AI/工单项随模块开关增减；bits-ui Tooltip 左侧悬浮；加号旋转 135° + fly 交错动画；`/admin/*` 为整页跳转，`<md` 隐藏。已管理员/普通账号、开/关设置、移动端视口浏览器验证）

## 服务器端待迁移清单

WebSocket 基础设施与控制台已完成；其余依赖它：

- [x] WebSocket 层（`$lib/websocket/Websocket.ts` 自 Sockette 封装逐字移植：auth/token 刷新/4409、4400 处理、transfer 重连；`$lib/stores/server.svelte.ts` Runes 版 ServerContext：per-server context store、`websocketEvent()` 等价 useWebsocketEvent、InstallListener/TransferListener 事件）
- [x] 服务器壳 `ServerArea`（侧栏/移动端底栏/权限门/管理员视角链接/StatusControls 常驻；冲突态、续期逾期锁定、连接横幅；路由表 `features/server/routes.ts` 随页面迁移逐步增加条目）
- [x] 冲突态 `ConflictState`（安装中/已暂停/维护/传输·恢复中四屏）与续期锁定 `ServerSuspended`（免费续期 `processFreeOrder`、付费跳转账单页）
- [x] 控制台 `/server/:id`（白名单已加 `^server/[a-z0-9-]+$`）：xterm 主题/按键逐字移植、命令历史持久化、CPU/内存/网络 ECharts 20 槽滑动窗口、五块实时统计、电源控制（含强停确认）、改名/描述编辑、重装确认、展开模式（localStorage 持久化 + 隐藏统计条）、日志导出。已浏览器验证（含维护警告、连接失败横幅、改名往返、展开/收起）
- [x] 文件管理（列表/网格、上传、下载、chmod、重命名、批量操作、压缩解压）。已浏览器验证（mock Wings 直连：目录导航/面包屑、新建目录、重命名/移动、chmod、复制、压缩/解压、下载签名 URL、单文件与批量删除含确认弹窗、网格视图切换 + localStorage 持久化、批量操作栏；本 fork 的 create-directory Wings 契约是 `{name, path}`，与上游 `{root, name}` 不同；上传前端流程已接 `getFileUploadUrl` + multipart，但 mock 无该端点未 round-trip）
- [x] 文件编辑器（CodeMirror 6，Svelte 5 封装 `CodeEditor.svelte`：compartments 动态切语言/重绑 Mod-s、ayu Mirage 主题逐字移植、`@codemirror/language-data` 按扩展名自动检测 + 手动下拉；路由 `files/:action/*` 在 FilesArea 内层匹配，`edit/*` 加载 + Mod-s/按钮保存、`new/*` 空文档 + 命名对话框。已浏览器验证：内容加载、编辑保存 round-trip、Mod-s keymap 拦截、新建文件全流程、Markdown 高亮；vendor-codemirror 独立 chunk 1.66MB 仅编辑器路由加载）
- [x] 数据库、备份、计划任务、子用户、网络配置、启动参数（白名单 `^server/[a-z0-9-]+/(files|databases|schedules|users|backups|network|startup)(/.*)?$`；路由表六项；API `$lib/api/{databases,backups,schedules,subusers,network,startup}.ts`。已用 root 管理员浏览器验证：真实 MariaDB 数据库主机上建库/轮换/删库；mock Wings 下备份创建/恢复 `truncate_directory`/删除、恢复后切换到“正在恢复备份”冲突屏；计划任务与任务全流程含立即运行；子用户邀请/改权限/移除；分配新建/备注/主分配/删除；启动变量保存后命令重新渲染、镜像切换。子用户受限账号视角（非 `*` 权限时的提示与禁用）未在浏览器中验证）
- [x] 活动日志、服务器计费、升级（白名单加 `activity(/.*)?`、`billing(/upgrade)?`；路由表三项，`condition` 改收 `ServerRouteFlags`。活动描述文案从 `resources/lang/en/activity.php` 译为中文放进 `$lib/utils/activity.ts`，因为旧前端依赖的 `/locales/locale.json` 已在 9ec051741 随 LocaleController 删除；事件筛选走 `#event=` hash。旧页还会发 `filter[ip]`，服务器端点只允许 `event`，会返回 400，所以没有移植 IP 筛选。计费页：统计卡片、续期环形进度、本服务器订单（`filter[server_id]`）、免费续期 / Stripe 续费、升级入口；升级页：选项卡片、按比例差价、跳 Stripe。已用 testadmin 在浏览器验证：53 条记录分页、筛选/清除、元数据弹窗；计费页数据与订单；差价 $2.00 计算正确。Stripe 只验证到请求体，因为本地是假密钥，测试服务器也不归 testadmin 所有）
- [x] 功能弹窗（EULA、Java 版本、GSL Token、PID 限制、Steam 磁盘、Hytale OAuth）：`features/server/features/`，按 `eggFeatures` 懒加载，每个弹窗单独一个 chunk，挂在控制台页。已用伪造 websocket 逐个验证：触发、`running` 状态下不弹、EULA 写 `eula.txt` 并发送 restart、Escape 不能关闭。Hytale 现在只打开日志里匹配到的 URL，旧版会把整行日志当链接打开。Java 换镜像和 GSL 提交的成功路径没有验证到：测试服务器的镜像是管理员手动设置的，后端返回 400；Paper egg 没有 `STEAM_ACC` 变量，`StartupController:56` 读到 null 后返回 500，这是后端已有的问题
- [x] InstallListener / TransferListener / ConflictStateRenderer

## 管理端待迁移清单

约 130 个组件，按分组逐步迁移。管理端由 `Admin\BaseController` 渲染（不走 IndexController），它有自己的白名单；`features/admin/routes.ts` 里未迁移的条目标 `legacy: true`，保留侧栏位置，点击时整页加载由旧前端渲染。两处必须同步。

- [x] 管理壳 `AdminArea`：分类侧栏（按 `app.can()` 和 `activity.enabled.admin` 过滤）、移动端底栏、权限门、模块指示器、角色徽章。跳转到 legacy 页面时由 `router.setDocumentPaths()` 直接整页加载，不先 pushState，否则浏览器后退会回到错误的外壳（已用 Playwright 复现并验证修复）
- [x] general：概览（版本、统计、建议操作）、活动日志（四个防抖筛选，事件/IP 走 hash，时间/事件排序，对象链接，元数据弹窗）、设置（核心 / 模式 / Webhooks / 调试四个标签页）、应用 API（列表、搜索、排序、创建、一次性显示 token、删除）。白名单：`admin`、`admin/activity`、`admin/(settings|api)(/.*)?`。已用 testadmin 在浏览器验证所有写操作的请求与 204/200 响应，新建的 API 密钥能用 Bearer 访问 `/api/application/servers`。和旧版的差异：模式切换旧版发送裸字符串，Laravel 读到 `mode=null` 并写入 null，现在按字段名发送；Webhook 启停和批量开关后旧版整页刷新，现在原地更新；API 密钥 `last_used_at` 为空时旧版显示 1970 年，现在显示“从未使用”。受限角色（非 root）视角未在浏览器中验证
- [x] modules：计费（未启用时显示启用卡片；八个标签页：概览（统计范围、建议操作、收入/转化率/订单数、订单状态条、每日收入柱状图 + 表格）、商品（分类列表 → 分类详情含 Nest/Egg 选择与商品表 → 商品表单，输入名称确认删除）、订单、发票（发票号搜索、用户和状态筛选、PDF 下载）、异常（单条/全部解决）、续期、优惠码（新建/编辑弹窗、删除）、设置（货币、自助升降级、导入/导出、Stripe 密钥填写/删除、法律文档链接、停用模块））。白名单加 `admin/billing(/.*)?`。API `$lib/api/admin/billing.ts`。标签页按各接口检查的权限隐藏。图表组件动态加载，vendor-charts 只在概览页下载。已用 testadmin 在浏览器验证全部写操作及请求体，并核对数据库存值；种子订单验证了概览统计（14 天 ¥25.00 / 50.0%，30 天 ¥45.00 / 60.0%）、风险指数排序、描述搜索；发票用 `InvoiceGenerationService` 生成真实 PDF 并下载成功；验证后已按备份恢复数据。Stripe 只验证到保存/删除密钥。**后端改动**：`Application\DiscountCodeTransformer` 补上 `active` 字段。和旧版的差异：旧版优惠码接口不返回 `active`，编辑弹窗总是默认“启用”，保存编辑会把已停用的码重新启用；旧版“剩余次数”留空会发送 0，而 `hasUsesRemaining()` 把 0 当作已用完，表格却显示“Unlimited”，现在留空发送 null（不限），0 显示为“已用完”；旧版编辑弹窗的类型按钮总是停在“百分比”；旧版优惠码增删改后表格不刷新；旧版订单表允许按 `type` 排序，`OrderController` 不允许，会返回 400，已去掉；旧版法律链接表单两个框初始为空、一起提交，只填一个会把另一个存成空字符串，现在预填当前值；旧版续期天数用 `parseInt`，清空输入会存成 `"NaN"`，现在要求整数且在范围内（1–365、0–90）；商品/分类请求在后端没有校验规则，旧版的 Yup 限制（CPU ≥ 10、内存/磁盘 ≥ 128、端口 ≥ 1、价格最多两位小数等）现在在前端执行；旧版概览每次进入都弹出 Stripe 配置窗口，现在是横幅加按钮，且无订单时转化率显示“—”而不是 `NaN%`；旧版商品价格写死 `$`，现在用商店货币；旧版异常“解决”按钮不等请求结果就显示已解决，“全部解决”不确认直接刷新，现在等请求完成并先确认；导入文件不是合法 JSON 时旧版当作 HTTP 错误并关闭弹窗，现在保留弹窗并提示；启停模块、删除密钥后旧版整页刷新，现在原地更新
- [x] modules：认证（注册开关、强制两步验证、登录尝试上限；添加模块弹窗只列出未启用的模块；Onboarding 说明文字、jGuard 延迟分钟数与灵敏度、Discord/Google 的 Client ID/Secret 与回调地址；移除模块前确认）。白名单加 `admin/auth`。API `$lib/api/admin/auth.ts`。启用/停用接口从 `$request->all()[0]` 读模块名，请求体必须是裸 JSON 字符串，已用 Laravel 请求对象和 axios 1.14 验证。已用 testadmin 在浏览器验证全部写操作并核对数据库存值（布尔存为 `"1"` / `""`）；“强制两步验证”没有实际开启，见下。和旧版的差异：旧版每个输入框每敲一个字就保存一次，Client Secret 会被存成半截；现在文本项点保存才提交，Secret 只发送填写了的那一项，留空不会覆盖已有值；登录尝试次数旧版可以存 0 或空值（后端转成 int 0），现在要求不小于 1，jGuard 延迟要求非负整数；开关保存失败时旧版不回退，现在会恢复原状态（同一问题也修在了 Webhook 事件开关上）。**新增提醒**：`RequireTwoFactorAuthentication` 开启后会拒绝未启用 TOTP 的账号的所有管理 API 请求，包括关闭这个选项的请求，所以当前管理员未启用两步验证时，开关下方会显示警告
- [x] modules：工单（未启用时显示启用卡片；列表搜索/排序；新建；详情页改状态、改提交者、改负责人或取消分配、删除；消息全文按新到旧显示，回复框在上方；选项页改数量上限、停用）、AI（启用卡片 → 填 Gemini 密钥 → 提问控制台；选项页改“允许普通用户使用”和更换密钥）。白名单加 `admin/(tickets|ai)(/.*)?`。API `$lib/api/admin/modules.ts`。用户选择器 `UserPicker` 用 `filter[*]` 一次请求搜索用户名/邮箱/UUID，负责人字段只列出管理员（root 或有管理角色）。已用 testadmin 在浏览器验证全部写操作及请求体；AI 只验证到保存密钥和设置，没有真实 Gemini 密钥所以未发起提问。和旧版的差异：旧版负责人字段标着“管理员”却列出所有账号；旧版消息截断为 64 字、需点“阅读”弹窗查看，且每页内倒序；旧版回复、启停后整页刷新，现在原地更新；旧版 AI 选项页的密钥框如果输入后又清空再提交，会发送空字符串 `key`，经 `ConvertEmptyStringsToNull` 变成 null 后清空已保存的密钥（已用 Laravel 请求对象复现），现在只在填写了新密钥时才发送；旧版 AI 控制台 2 个字符就会发送，后端要求至少 3 个，会返回 422
- [x] appearance：主题（五个颜色，拖动取色器时 400 ms 防抖只发一次请求；恢复默认后整页刷新读取 config 默认值）、链接（列表、搜索、排序、新建/编辑弹窗、删除；改动后同时刷新用户端侧栏的链接查询）、告警（常规 / 外观两个标签页：开关、类型、内容 3–300 字校验、UUID；四种位置点选即保存）。白名单加 `admin/theme`、`admin/(links|alerts)(/.*)?`。API `$lib/api/admin/appearance.ts`。已用 testadmin 在浏览器验证全部写操作，包括用户端 `/api/client/links` 只返回可见链接、告警保存后 UUID 更换并显示在用户端首页。和旧版的差异：链接弹窗旧版请求失败时没有任何提示（promise 没有 catch），现在显示错误并保持打开；旧版表格允许按 `url` 排序，但后端只允许 `id/name/visible`，会返回 400，所以去掉了；取色器旧版拖动一次会发几十个请求。主题颜色只作用于旧版页面，新前端用自己的设计 token。预览改为用这五个颜色画的示意图：`SetSecurityHeaders` 对所有响应发送 `X-Frame-Options: DENY`，旧版用 `<iframe src="/">` 做预览，所以旧版预览框一直是空白的（视觉验证时发现）。**这些品牌色在新前端里不生效，全部迁完后需要决定是否把它们接入 Tailwind 主题变量。**
- [x] management：数据库主机（列表搜索/排序、新建弹窗、编辑页、删除确认）。白名单加 `admin/databases(/[^/]+)?`。API `$lib/api/admin/databases.ts`。表格辅助组件（`SearchBox`、`SortHeader`、`TableState`）移到 `features/admin/shared/`，计费模块同时改用这里。已用 testadmin 在浏览器验证：主机名/端口校验、错误凭据时后端连接检查失败且不入库（错误信息原样显示）、用本机 MariaDB 新建、改名并保留原密码、搜索与排序、删除。**后端改动**：`Application\Databases\DatabaseController` 的 `view` / `update` / `delete` 参数名从 `$database` 改为 `$databaseHost`，与路由 `{databaseHost:id}` 对上。改之前隐式绑定拿不到参数，注入的是空模型：查看接口 500（`created_at` 为 null），更新接口 500（`HostUpdateService::handle()` 收到 null id），删除接口返回 204 但什么也没删。旧版编辑页同样因此无法打开。和旧版的差异：旧版“状态”列在浏览器里 `fetch('host:port')`，到不了 MySQL（IP 被当作面板上的相对路径，主机名被当作未知协议），所以显示的红心或警告与主机实际状态无关，已去掉，保存时的连接检查才是真正的检测；旧版校验允许端口 2–65534、主机和用户名可为空，现在按 `DatabaseHost::$validationRules`；`databases.database_host_id` 外键没有 ON DELETE，主机上还有服务器数据库时后端删除会报外键错误，现在编辑页显示数量并禁用删除按钮
- [x] management：用户与管理员角色（用户列表：`filter[*]` 搜索用户名/邮箱/UUID/外部 ID、六列排序、权限徽章；新建用户；用户详情四个标签页：资料、服务器（按 `owner_id`）、活动、管理（暂停/恢复、删除）；角色列表、新建弹窗、角色详情：名称/描述/颜色、按分组勾选权限并支持组内全选、删除）。白名单加 `admin/users(/.*)?`。路由 `users/*`（users.read）和 `users/roles/*`（roles.read）都指向 `UsersArea`，只有角色权限的管理员也能进角色页。API `$lib/api/admin/users.ts`。已用 testadmin 和一个只有 `users.read` + `users.update` 角色的账号分别在浏览器验证全部写操作及请求体，并核对数据库；验证后已按备份恢复。和旧版的差异：旧版新建用户允许不填密码并提示“会给用户发送设置密码的邮件”，实际上 `UserCreationService` 只存一个随机密码、丢弃重置 token、不发邮件，而找回密码要用恢复码，所以这个账号无法登录，现在新建时密码必填（至少 8 位）；旧版表单会发送 `state`，`StoreUserRequest` 不接收这个字段，暂停只能走 suspend 接口；非 Root 管理员修改 Root 或角色会被后端拒绝，现在这两项对他们只读（后端严格比较 `admin_role_id`，所以总是原样发送）；不能在资料页取消自己的 Root、不能删除自己；Root 管理员不能被暂停，按钮不再显示；旧版暂停/恢复都提示“已暂停”且不刷新状态；旧版搜索只匹配用户名；角色权限现在走 `PATCH …/roles/{id}/permissions`，它会丢弃未知的权限键，旧版用通用更新接口原样存储数组（这个接口用 `UpdateRoleRequest` 校验、要求 `name`，所以请求里带上当前名称）；旧版角色权限保存没有任何提示也不处理错误；旧版删除角色后跳转到不存在的 `/admin/roles`；角色名上限按后端为 64（旧版 32）；颜色可以清空（旧版颜色框为空时也会存黑色）
- [x] management：节点（列表搜索/五列排序、已分配/总量、维护中徽章；新建节点：快速/高级两种模式，创建后跳到配置文件页并显示后续步骤；节点详情五个标签页：概览（Wings 在线状态、系统信息、内存/磁盘/端口分配占用条、SuperDaemon 实时用量）、设置（全部字段、数据库主机下拉、删除）、配置文件（config.yml + 复制）、分配（搜索、只看未分配、IP/端口/服务器排序、批量添加、单个删除、删除全部未使用）、服务器）。白名单加 `admin/nodes(/.*)?`。API `$lib/api/admin/nodes.ts`，服务器列表行抽成 `$lib/api/admin/servers.ts` + `features/admin/shared/ServerSummaryTable.svelte`，用户详情页的服务器标签也改用它。已用 testadmin 在浏览器验证全部写操作及请求体并核对数据库，节点概览和“Wings 在线时保存”用本地 mock Wings（`/api/system`、`/api/system/utilization`、`/api/update`）验证；验证后已按备份恢复。**后端改动**：`AllocationController::deleteAll` 原来是 `Allocation::where('server_id', null)`，没有限定节点，在任何一个节点上点“删除所有未使用的分配”都会删掉全部节点的空闲分配（已在事务里复现：对节点 3 调用后节点 4 的 5 个空闲分配也被删除），现在加上 `node_id`。和旧版的差异：旧版新建分配对每个 IP 发请求但不等待、不捕获错误，并把返回结果错误地合并进缓存，现在按顺序提交并列出每个失败的 IP；旧版删除单个分配后缓存过滤条件写反，只留下被删的那一行；`AssignmentService` 拒绝 ≤ 1024 的端口，请求规则却写 `min:1024`，现在前端从 1025 起；起止端口区间旧版不限数量，现在一次最多 1000 个（与服务里区间字符串的上限一致）；旧版 IP 建议只取第一页；“已使用的端口分配”占用条旧版读 `meta.utilization.allocations`，后端从不返回，所以永远是 0%，现在按分配接口的总数计算；后端在 Wings 不可达时仍会保存节点设置，但返回 `ConfigurationNotPersistedException`，旧版当作保存失败，现在重新读取节点并显示“已保存但未推送到 Wings”；节点名后端只接受英文字母、数字、空格、点、连字符和下划线（PHP `\w` 不带 `u`），旧版不校验，中文名会得到 422；旧版内存/磁盘默认 0，后端要求至少 1；节点上还有服务器时删除按钮禁用并显示数量
- [x] management：服务器与预设（服务器列表：名称和标识一起搜索、六列排序、所有者/节点链接、状态徽章、勾选后批量启动/重启/停止/强制停止；新建服务器：基本信息、所有者搜索、节点与空闲主分配、资源与功能限制、Nest/Egg/镜像/启动命令/Egg 变量、安装后启动、跳过安装脚本；用预设创建；服务器详情：设置（含描述、主分配切换、增删分配、删除含强制删除）、启动（更换 Egg、变量）、数据库、计费（开关计费、分类/套餐、续期时间、本服务器订单）、活动、管理（重装、安装状态、暂停/恢复、迁移）；预设列表、新建/编辑弹窗、详情、删除）。白名单加 `admin/servers(/.*)?`。路由 `servers/*`（servers.read）和 `servers/presets/*`（server-presets.read）都指向 `ServersArea`。API `$lib/api/admin/servers.ts`；用户页和服务器页的活动列表抽成 `features/admin/shared/ActivityFeed.svelte`；`OrdersTab` 加了 `serverId` 参数在服务器计费页复用。已用 testadmin 在浏览器验证全部写操作及请求体并核对数据库：两个 mock Wings 节点上完成创建（Wings 收到 `start_on_completion: true`）、改设置、切换主分配并移除旧分配、改变量、换 Egg、开启计费、暂停/恢复、安装状态来回切换、重装、批量重启（Wings 收到 power 请求）、迁移到另一节点（生成 transfer 记录、源节点收到 transfer 请求）、用预设创建、普通删除和强制删除；验证后已按备份恢复。**后端改动（都已在会回滚的事务里复现后再修）**：① `UpdateServerRequest::validated()` 总是带上 `renewal_date`、`billing_product_id`（值为 null），`DetailsModificationService` 用 `array_key_exists` 判断，于是任何一次保存设置都会清空续期时间和计费套餐；描述没传时也会被写成空字符串。现在只在请求里有这些字段时才传给服务，描述未传时保留原值。② `UpdateServerRequest` 用 `getRules()` 而不是 `getRulesForUpdate()`，`external_id` 的 unique 规则不排除自身，设置过外部 ID 的服务器每次保存都报“has already been taken”。③ `StoreServerRequest` 没有 `start_on_completion` 规则，`validated()` 读不到，“安装完成后启动”永远是 false。④ `ServerPresetCreationService` 用不存在的 `$preset->node_id` 当 nest_id，总是落到 nest 1，预设的 Egg 不在 nest 1 时服务器的 nest/egg 不一致；现在从 Egg 取 nest。⑤ 管理端订单接口加了 `server_id` 精确筛选，因为订单名是随机 UUID，旧版按服务器 UUID 前 8 位筛选订单名永远为空。和旧版的差异：旧版新建表单发送 `externalId`（后端只认 `external_id`，外部 ID 被丢弃），没有任何校验，启动命令留空；旧版换 Egg 时把启动命令清空，而 `StartupModificationService` 收到空值会保留旧命令，所以服务器继续用旧 Egg 的命令，现在换成新 Egg 的默认命令；旧版启动页的变量要等每个变量框挂载后才写入，现在一开始就带上已存的值；旧版“以用户视角查看”链接到 `/server/<UUID 前 8 位>`，与 `uuidShort` 不同的服务器会 404（server 31 就是），现在用标识；旧版用户页、节点页的服务器表传入的筛选条件没有生效，显示的是全部服务器；旧版数据库标签页列出的是所有数据库主机，现在是这台服务器的数据库；旧版计费标签页在服务器没有套餐时禁用，无法从这里开启计费，提交时把整个服务器对象当请求体并整页刷新，续期时间按浏览器时区偏移了一次；旧版管理操作在请求完成前就关闭弹窗、不刷新状态，迁移弹窗只看目标节点前 20 个分配；后端把重装和暂停挂在 `servers.delete` 权限上，迁移和安装状态挂在 `servers.update`，按钮按此显示；旧版预设向导不处理请求错误，资源默认 0，换 Nest 后 Egg 不跟着变
- [x] services：Nests 与 Eggs（Nest 列表搜索/排序、新建/编辑弹窗（作者邮箱创建时填写，之后只读）、删除；Nest 详情：ID/UUID/作者、Egg 表格搜索/排序、导入、新建 Egg；Egg 详情三个标签页：设置（名称、描述、Docker 镜像按“名称 + 地址”逐行编辑、启动命令、停止命令、启动配置与配置文件两个 JSON 编辑器，保存前检查 JSON；继承配置时给出提示）、变量（逐张卡片编辑后一次保存全部、新建弹窗、删除确认；保留名、重名、环境变量格式、验证规则在前端先检查）、安装脚本（CodeMirror shell 编辑器、安装容器、入口命令；脚本复制自其他 Egg 时给出提示）；导出直接下载 `egg-<名称>.json`；导入支持选文件或粘贴，JSON 和 YAML 都可以，成功后打开新 Egg）。白名单加 `nests`；`routes.ts` 不再有 legacy 条目，`legacy()` 辅助函数删除（AdminArea 仍支持 `legacy: true`）。API `$lib/api/admin/nests.ts`。CodeMirror 通过 `CodeField` 懒加载文件管理器的 `CodeEditor`，只在 Egg 页面请求。与旧版的差异：旧版导出弹窗的“保存”按钮没有功能；导入失败只写 console；删除变量后界面只剩被删的那个（filter 写反）；删除 Egg 后回到 Nest 列表，现在回到所属 Nest；安装脚本在编辑器未就绪时点保存什么都不做。后端修复：新建变量时“用户可见/可修改”总是存成 false（`VariableCreationService` 读的是旧的 `options` 数组）；删除变量每次 500（路由参数 `{eggVariable}` 让 scoped binding 去找不存在的 `Egg::eggVariables()`，改为 `{variable}`）；删除仍有服务器在用的 Egg 抛出 SQL 外键错误，现在返回 400 和说明；导入非对象的 JSON/YAML 时抛出 PHP 类型错误（500），现在返回 400；新建 Nest 时表单里的作者邮箱被忽略、换成默认作者；更新 Nest 返回的是更新前的数据；安装脚本不能保存为空（规则缺 `nullable`）。另：`StoreEggRequest` 的停止命令是 `required|nullable`，空值会被拒，所以新建 Egg 时前端要求填写停止命令（继承配置时除外）。已用 testadmin 在浏览器验证：Nest 新建/编辑/删除（级联删除其 Egg 和变量）、导出 Paper 后导入新 Nest（4 个变量、9 个镜像）、错误 JSON 导入提示、设置保存与无效 JSON 拦截、变量新建（可见/可修改为 1）/编辑/删除且未保存的修改保留、安装脚本保存与清空、新建 Egg、在用 Egg 和 Nest 删除被拒；测试后从备份恢复 nests/eggs/egg_variables/活动日志
- [x] setup 安装向导（`features/setup/SetupWizard.svelte`，懒加载；`App.svelte` 在 `app.needsSetup`（root 管理员且 `settings.setup` 为 false）时用它替换整个应用，判断顺序在 Onboarding 之前，和旧版 App.tsx 一致。五步：欢迎、现有数据（用户/节点/服务器/Egg 数量，只有一个用户时提示先确认数据库已导入）、主题主色（八个预设，点击即保存）、面板模式（标准/个人，点击即保存）、完成；第一步可以跳过向导。完成或跳过后整页刷新。API 加在 `$lib/api/admin/general.ts`：`getSetupData`、`finishSetup`。与旧版的差异：旧版各步请求失败只写 console，完成请求失败时按钮没有反应；颜色勾选标记停在打开向导时的颜色。已用 testadmin 在浏览器验证（临时设 `APP_ENVIRONMENT_ONLY=false`、`settings::app:setup=0`）：`/` 和 `/admin/servers` 都显示向导、数量与数据库一致、颜色写入 `theme` 表、模式写入 `settings::app:mode`、完成和跳过都写入 `app:setup=1` 并在刷新后进入原页面、活动日志有三条事件；测试后恢复 settings、theme、活动日志和 .env）

## 已建立的基础设施

| 模块 | 文件 | 说明 |
|---|---|---|
| 引导数据契约 | `src/types/bootstrap.ts` | 四个 `window.*` 全局变量的类型 + `transformUser` |
| HTTP 客户端 | `src/lib/api/http.ts` | axios + CSRF 拦截器 + 419 处理 + Fractal 分页/QueryBuilder 辅助 |
| 路由 | `src/lib/router/{match,router.svelte,types}.ts` | 自研类型安全路由，兼容旧路由表语法（`:param`、`*`），按特异性排序 |
| 状态 | `src/lib/stores/app.svelte.ts` | Runes 实现，替代 easy-peasy 全局 store |
| 主题 | `src/lib/stores/theme.svelte.ts` | 深浅色 + 系统跟随，首屏防闪烁脚本在 Blade 中 |
| 权限 | `src/lib/utils/permissions.ts` | 管理员权限（含 `.*` 通配）+ 子用户权限 |
| 表单 | `src/lib/forms/form.svelte.ts` | Zod + Runes，替代 Formik + Yup |
| 模型/转换器 | `src/lib/api/definitions/server.ts`、`src/lib/api/transformers/server.ts` | 逐字段移植，保持后端响应契约不变 |
| UI 组件 | `src/lib/ui/` | Button、Card、Input、Textarea、Label、Spinner、Dialog、ConfirmDialog（bits-ui） |
| 共享组件 | `src/lib/components/` | Link、Alert、PageHeader、NotFound、ThemeToggle、CopyButton |

## 关键决策记录

1. **不使用 SvelteKit**。HTML 外壳由 Laravel Blade 生成并注入 4 个引导全局变量，Laravel catch-all 负责深层路由。SvelteKit 要掌管外壳与路由，引入它需重写后端渲染层。采用 Svelte 5 + Vite 纯 SPA。

2. **不使用 sv-router**。当时最新版本为 0.19（pre-1.0）。旧路由表是数据驱动的、带权限与功能开关元数据，自研约 150 行匹配器可完整兼容其语法，避免生产环境依赖 0.x 包。

3. **前端物理隔离**。`frontend/` 有独立依赖树。旧应用用 Vite 4 / Tailwind 3 / TS 4.9，新应用用 Vite 8 / Tailwind 4 / TS 5.9，无法共用一套配置。

4. **Vite manifest 路径**。Vite 默认写 `.vite/manifest.json`，Laravel 读 `<buildDirectory>/manifest.json`，已通过 `build.manifest: 'manifest.json'` 对齐。manifest key 相对于 `frontend/` 根目录，即 `src/main.ts`。

5. **资源标签由独立 Vite 实例生成**。`SvelteAssetComposer` 新建 `Vite` 实例而非改共享单例，避免 `useBuildDirectory` 污染同一请求中其他视图的旧前端标签。

6. **生产构建 `base: '/build-svelte/'`，dev 保持 `/`**。Laravel 只重写 manifest 里入口标签的 URL；bundle 运行时自行解析的懒加载 chunk（动态 `import()`、chunk CSS）按 `base` 拼接。生产缺少该前缀时 chunk 请求落到 `/assets/…`，被 Laravel catch-all 回退成 index.html（text/html），模块 MIME 校验失败、页面报 "This page failed to load."。dev 的入口标签来自 hot 文件（不带 build 目录），故 dev 必须保持 `/`。

7. **服务器页懒加载 chunk 独立**。xterm（~303 kB）与 ECharts（~1.1 MB）通过 `manualChunks` 隔离进 vendor-xterm / vendor-charts，只有控制台路由加载它们。CodeMirror + Lezer（~1.66 MB）同样隔离进 vendor-codemirror，仅文件编辑器路由加载。**2026-11-07 发现**：Vite 的 preload helper 被打进了 vendor-codemirror，`main` 静态 import 了它，所以 manifest 里 `src/main.ts` 的 imports 包含 `_vendor-codemirror-*.js`，每个页面都会下载这 1.66 MB。去掉计费路由重新构建结果相同，问题早于计费迁移。**2026-11-08 已修复**：preload helper 的模块 ID 是 `\u0000vite/preload-helper.js`，在 `manualChunks` 里把它和 rolldown runtime 一起固定进 `_runtime` chunk，main 的 imports 不再包含 vendor-codemirror（已核对 manifest 并在浏览器验证：首页和管理端 Nest 列表不下载 CodeMirror，Egg 设置页会下载，vendor-codemirror 仍在编辑器 chunk 的依赖里）。

8. **文件目录导航用 URL hash**。与旧前端一致，`/server/:id/files#/plugins` 表示目录，文件管理器单一路由内监听 hash 变化切换目录；编辑器则走真实路径段 `files/edit/<encoded path>`、`files/new/`。两条外层路由合并为 `files/*` 一条（action 路由在 FilesArea 内层匹配），避免外层 `:action` 吃掉路径段后内层把文件名误当 action。

9. **数据库密码字段读 `relationships.password.attributes.password`**。后端 include 返回 `{ object: null, attributes: { password } }`，旧前端 transformer 读 `.object`，所以旧面板从未显示过数据库密码与带密码的 JDBC 串。新前端按实际响应读取，旧前端未改动。

10. **对话框不叠放**。bits-ui 两层 Dialog 叠放时内层无法点击，备份操作菜单在打开确认框前先关闭自身（旧前端也是下拉菜单 → 模态框的单层流程）。确认框统一用 `ConfirmDialog`，回调抛错时对话框保持打开并显示错误。

11. **不再按路径白名单选外壳**。所有页面迁移完成后，`Base\IndexController`、`Admin\BaseController` 和 `Auth\LoginController` 只看 `APP_FRONTEND`：`svelte` 时所有路径都用 Svelte 外壳，未知路径显示 Svelte 的 404 页；改成 `legacy` 即整体回退到旧前端。`AdminArea` 里处理 `legacy: true` 路由的逻辑保留但已没有路由使用。

## 版本矩阵

Node v22.20.0、pnpm 9.0.6。

新前端：Svelte 5.57.3、Vite 8.3.5、`@sveltejs/vite-plugin-svelte` 7.3.1、TypeScript 5.9.3、Tailwind 4.3.4、bits-ui 2.20.4、`@lucide/svelte` 1.68.0、TanStack Svelte Query 6.3.9、TanStack Svelte Table 9.3.1、ECharts 6.1.0、Zod 4.6.7、axios 1.14.0、svelte-check 4.7.8、`@simplewebauthn/browser` 13.3.0（与旧前端同版本）、uqr 0.1.2（2FA 二维码，替代 qrcode.react）、@xterm/xterm 5.5.0（+ addon-fit/search/web-links，与旧前端同版本）、sockette 2.0.6、strip-ansi 7.1.0。

约束来源：`vite-plugin-svelte` 7 要求 Vite ^8；`svelte-check` 4 要求 TypeScript ^5 || ^6（因此不用 TS 7）。

旧前端依赖未做任何改动。
