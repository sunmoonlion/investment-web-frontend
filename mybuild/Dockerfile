# ============================================================================
# 重要说明：本地环境 vs Docker 构建环境
# ============================================================================

# 关键问题：如果本地环境和 Docker 环境不一致，会导致构建失败！
# 解决方案：
# 1. 使用精确的 Node.js 版本（node:20.18.0 而不是 node:20）
# 2. 使用 .nvmrc 锁定本地 Node.js 版本
# 3. 在 Docker 中生成 lock 文件（最佳实践）
# 4. 定期检查版本是否一致
#
# 因此，Dockerfile 必须：
# 1. 显式安装所有系统依赖（不能假设已存在）
# 2. 显式配置所有环境变量（不能依赖本地环境）
# 3. 使用精确的 Node.js 版本（确保与本地一致）
# 4. 确保所有构建步骤在 Docker 环境中可重复执行
# ============================================================================

# 使用精确的 Node.js 版本，确保本地和 Docker 环境一致
# 本地环境：v20.18.0（由 app/.nvmrc 文件指定）
# Docker 环境：node:20.18.0（与本地版本保持一致）
# 
# 使用方式：
# - 本地开发时：在项目目录运行 `nvm use` 切换到 Node.js 20.18.0
# - Docker 构建时：使用 FROM node:20.18.0，确保版本一致
# 
# 注意：使用 node:20 会拉取最新版本（如 20.19.6），可能导致不一致
#
# REGISTRY 默认指向 Harbor 缓存（CI 和内网构建均可用）；
# 纯外网本地构建可传 --build-arg REGISTRY= 退回 DockerHub。
ARG NODE_VERSION=20.18.0
ARG REGISTRY=harbor.sunmoonai.com:30443/k8s-images

FROM ${REGISTRY}/node:${NODE_VERSION}-alpine AS build

# ============================================================================
# 代理配置（可选，仅在国内网络环境需要）
# ============================================================================
# 如果在国外主机构建，通常不需要代理配置
# 如果需要代理，可以通过 --build-arg 传递：
#   docker build --build-arg HTTP_PROXY=http://proxy.example.com:8080 \
#                --build-arg HTTPS_PROXY=http://proxy.example.com:8080 \
#                -f mybuild/Dockerfile -t research-web-frontend:1.0.0 .
# ============================================================================
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG http_proxy
ARG https_proxy
ARG NO_PROXY
ARG no_proxy

# 设置代理环境变量（仅在传递了代理参数时生效）
ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    http_proxy=${http_proxy} \
    https_proxy=${https_proxy} \
    NO_PROXY=${NO_PROXY} \
    no_proxy=${no_proxy}

# NEXT_PUBLIC_* 构建时静态嵌入 bundle，CI 通过 --build-arg 注入
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_NAME=research
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}

# 使用 Alpine 构建，pnpm 会按 musl 平台安装 Next/SWC/sharp 的可选依赖。
# 这里不安装编译工具，避免把 build-only 系统依赖引入镜像层。

ARG NPM_CONFIG_REGISTRY=https://registry.npmmirror.com
ENV npm_config_registry=${NPM_CONFIG_REGISTRY} \
    COREPACK_NPM_REGISTRY=${NPM_CONFIG_REGISTRY} \
    COREPACK_INTEGRITY_KEYS=0 \
    npm_config_fetch_retries=5 \
    npm_config_fetch_retry_maxtimeout=120000 \
    npm_config_fetch_timeout=600000

# 安装 pnpm，使用 npm 的重试/超时参数避免 corepack 短超时导致构建中断。
RUN timeout 120 npm install -g pnpm@10.24.0 \
    --registry="${NPM_CONFIG_REGISTRY}" \
    --fetch-retries=5 \
    --fetch-retry-maxtimeout=120000 \
    --fetch-timeout=120000

ENV CYPRESS_INSTALL_BINARY=0 \
    ELECTRON_SKIP_BINARY_DOWNLOAD=1 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# 注意：不设置 NODE_ENV，由 next build 内部自动设为 production
# 若在此处设置 NODE_ENV=development，React 会使用开发模式构建，
# 导致 /_global-error 预渲染时 useContext 报错
# CI=true：pnpm 在无 TTY 的 Docker 环境中需要此变量才能正常执行
ENV CI=true

# 构建上下文为子模块根目录；源码在 app/ 子目录
COPY app/ /frontend
WORKDIR /frontend

RUN --mount=type=cache,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store && \
    pnpm install --frozen-lockfile --network-concurrency=3

# 须在 next.config 中配置 output: 'standalone'
RUN pnpm build

FROM build AS run-dev
CMD ["pnpm", "dev"]

FROM build AS run-start
ENV NODE_ENV=production APP_ENV=production
ENTRYPOINT ["pnpm"]
CMD ["start"]

# 使用独立运行阶段，只带 Node Alpine 基础镜像和 Next standalone 产物。
# 不要 FROM build，否则会把 pnpm store、node_modules、构建缓存和编译依赖一起带进最终镜像。
FROM ${REGISTRY}/node:${NODE_VERSION}-alpine AS run-minimal

# ============================================================================
# 代理配置（可选，与 build 阶段相同）
# ============================================================================
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG http_proxy
ARG https_proxy
ARG NO_PROXY
ARG no_proxy

# 设置代理环境变量（用于 apk、npm/pnpm 等）
ENV HTTP_PROXY=${HTTP_PROXY} \
    HTTPS_PROXY=${HTTPS_PROXY} \
    http_proxy=${http_proxy} \
    https_proxy=${https_proxy} \
    NO_PROXY=${NO_PROXY} \
    no_proxy=${no_proxy}
WORKDIR /app
ENV NODE_ENV=production \
    APP_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Next.js standalone：需 next.config 中 output: 'standalone'
COPY --from=build /frontend/public ./public
COPY --from=build /frontend/.next/standalone ./
COPY --from=build /frontend/.next/static ./.next/static

EXPOSE 3000
ENTRYPOINT ["node"]
CMD ["server.js"]
