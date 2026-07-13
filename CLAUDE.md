# 用户端前端（research-web-frontend）— Claude Code 规则

> 进入本目录时自动叠加，补充根目录 CLAUDE.md 的全局规则。本文件只约束局部编码；若与代码/OpenAPI、父 App 根 `README.md` 或 k8s v5 权威文档冲突，以后者为准。

## 技术栈

- Next.js 16 + React + TypeScript
- shadcn/ui + Tailwind CSS v4
- Zustand（auth store）
- axios（请求封装，见 `app/lib/request.ts`）
- next-intl（i18n）
- `output: 'standalone'`（生产镜像，见 `mybuild/Dockerfile`）

## 关键约定

**BFF 内置**：`app/app/api/auth/` 是 Next.js API Routes，承担 OIDC 回调、session 管理，不需要额外 BFF 后端（除非 `NEXT_PUBLIC_BFF_PROVIDER=backend`）。

**鉴权**：登录态由服务端 session 维护；不把 access token 写入 `localStorage`；401 时跳转 `/api/auth/login`。

**请求封装**：统一走 `app/lib/request.ts`（axios 实例），不在页面内裸调 fetch/axios。

**字段对齐**：字段名、状态码以后端及 `API_CONTRACT.md` 为准，前端做适配。

**字段容错**：后端空值/可选字段做兜底，避免渲染崩溃。

**四态覆盖**：关键页面覆盖 loading / error / empty / success。

**Docker 联动**：变更 `app/next.config.ts` 中构建相关配置时，同步检查 `mybuild/Dockerfile`。

## 目录结构速查

```
app/
├── app/
│   ├── (auth)/login/page.tsx         # 登录页
│   ├── api/auth/
│   │   ├── login/route.ts            # → Casdoor 授权页
│   │   ├── callback/route.ts         # code 换 token，写 session
│   │   ├── logout/route.ts           # 清除 session
│   │   └── me/route.ts               # 读取当前用户
│   └── [locale]/                     # i18n 路由
├── lib/request.ts                    # axios 实例（401 自动跳转）
├── store/auth.ts                     # Zustand auth store
├── i18n.ts                           # next-intl 配置
└── middleware.ts                     # i18n 路由中间件
mybuild/
├── Dockerfile                        # 多阶段构建（standalone 模式）
└── README.md
```

## 开始一个页面前

1. 读对应后端路由，确认接口参数与响应结构
2. 从后端路由/OpenAPI 和 contract tests 更新 typed client/adapter；不维护手写的平行契约
3. 确认页面范围已进入任务明确指定的权威计划，并补齐 route/contract/E2E 证据
