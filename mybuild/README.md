## 新体系构建入口（2026-10-03）

本目录 Dockerfile 仍是组件配方；配套的固定基础镜像、源码版本、国内下载失败后官方代理重试由五仓并列的 k8s/infrastructure 统一编排：

```sh
cd ../../k8s/infrastructure
make application-source-plan APP=investment COMPONENT=web
make application-build-web APP=investment
make application-publish-web APP=investment
```

以上 cd 从本子仓根目录执行。默认国内直连，下载网络失败后自动检查 HTTPS_PROXY 并最多重试一次；不能连通即失败退出，保留 TLS、签名和锁文件完整性校验。构建/运行 Node 基镜像使用同一 libc 系列，版本与摘要由 k8s 物料锁确定。

旧 build-image.sh 不作为新体系入口，本次未扩展其功能，按旧流程退役计划处理。下面保留旧流程说明，不能当作新体系日常操作。

---

# investment-web-frontend 镜像构建

该目录构建 Next.js Web standalone 镜像。源码在子模块根的 `app/`，
构建上下文是子模块根；运行镜像使用 Dockerfile 锁定的 Node LTS 和 standalone 产物。

## 本地构建

在子模块根目录执行：

```bash
bash mybuild/build-image.sh --tag architecture-v2-dev
bash mybuild/test-release-tag.sh
```

或直接构建（直接调用 Docker 时也必须遵守正式标签保护规则）：

```bash
docker build -f mybuild/Dockerfile -t investment-web-frontend:architecture-v2-dev .
```

`build.conf` 的 `TPL_SSR_IMAGE` / `TPL_SSR_TAG` 指定镜像和开发标签；
`TPL_SSR_IMAGE_REGISTRY` / `TPL_SSR_IMAGE_PROJECT` 指定 Harbor 目标，默认项目
`app-images`。变量名保留模板兼容，不表示运行时 App 身份。默认只构建；
`PUSH_IMAGES_AFTER_BUILD=true` 会额外推送，须有相应授权。

构建和独立推送脚本在访问 registry、读取凭据前拒绝 `1.0.0` / `2.0.0`。
需要推送已验收的开发候选时，另行使用 `push-image.sh --tag <开发标签>`。
构建不自动部署；不得沿用旧 v1 部署目录或覆盖正式镜像。

## 运行时契约

浏览器只访问同源 `/api`。容器必须在运行时提供：

- `DEPLOYMENT_ENV`
- `AUTH_APP`
- `APP_ORIGIN`
- `BACKEND_INTERNAL_URL`
- `DEPLOYMENT_ID`

禁止把 Casdoor secret、Redis 凭据或服务 token 作为 `NEXT_PUBLIC_*` 或 Docker
构建参数写入 bundle。构建时使用的本地默认值只用于可复现构建，生产 Pod 启动时
由环境校验拒绝缺失或不安全的配置。

## 发布门禁

镜像只有在 typecheck、lint、i18n、unit/component、Next production build、
配对 E2E、Docker smoke、KIND 严格 TLS 和前后端兼容/回滚矩阵全部通过后，
才允许进入独立正式发布流程。本地脚本和开发测试通过不等于已完成正式发布。
