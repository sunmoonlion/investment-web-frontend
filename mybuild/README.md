# Tpl App SSR 镜像构建

## 架构设计

SSR 镜像构建采用直接使用源代码的方式：

- **源代码位置**：项目根目录的 `app/` 目录（源代码就在同一项目中）
- **构建方式**：使用 `build-image.sh` 脚本构建镜像，Dockerfile 直接从 `../app/` 复制源代码
- **镜像名称**：`investment-web-frontend:1.0.0`（可在 build.conf 中配置）
- **优势**：代码和构建配置在一起，代码修改时自动同步，不需要手动复制源代码

## 文件说明

### Dockerfile
SSR 镜像构建文件，基于精确的 `node:24.18.0` LTS 镜像，使用多阶段构建：
- `build` 阶段：构建 Next.js 应用（`pnpm build`）
- `run-dev` 阶段：开发环境运行
- `run-start` 阶段：生产环境运行
- `run-minimal` 阶段：最小化生产镜像

### build-image.sh
镜像构建和推送脚本，支持构建、推送等操作。

### build.conf
构建配置文件，包含镜像名称、标签、镜像仓库等配置。

## 使用 build-image.sh 构建镜像（推荐）

### 基本用法

```bash
cd mybuild

# 构建镜像（根据 build.conf 中的 PUSH_IMAGES_AFTER_BUILD 配置决定是否推送）
./build-image.sh

# 使用自定义标签构建
./build-image.sh --tag 1.0.1
```

### 推送配置

镜像是否推送由 `build.conf` 中的 `PUSH_IMAGES_AFTER_BUILD` 配置控制：

- `PUSH_IMAGES_AFTER_BUILD="true"`：构建完成后自动推送镜像到 Harbor
- `PUSH_IMAGES_AFTER_BUILD="false"`：仅构建镜像，不推送（默认）

### 选项说明

| 选项 | 说明 |
|------|------|
| `--tag TAG` | 指定自定义标签（覆盖 build.conf 中的配置） |

### 完整流程示例

```bash
# 1. 构建并推送镜像（如果 PUSH_IMAGES_AFTER_BUILD=true）
cd /home/zym/investment-web-frontend/mybuild
./build-image.sh

# 2. 部署服务（在 K8s 部署目录）
cd /home/zym/k8s/sunmoonai/app-platform/business-apps/tpl-app/investment-web-frontend/deploy-tpl-frontend
./deploy-tpl-frontend.sh deploy dev
```

## 手动构建（不使用脚本）

也可以直接使用容器运行时命令：

```bash
# 在项目根目录执行（构建上下文是项目根目录）
cd /home/zym/investment-web-frontend

# 使用 docker
docker build -f mybuild/Dockerfile -t investment-web-frontend:1.0.0 .

# 或使用 nerdctl
sudo nerdctl build -f mybuild/Dockerfile -t investment-web-frontend:1.0.0 .
```

**注意**：
- 构建上下文是项目根目录（`..`）
- 使用 `-f mybuild/Dockerfile` 指定 Dockerfile 路径
- Dockerfile 中的 `COPY app/` 会从构建上下文（项目根目录）复制 `app/` 目录

## 配置说明

### build.conf 配置项

- `TPL_SSR_IMAGE`: 镜像名称（默认: `investment-web-frontend`）
- `TPL_SSR_TAG`: 镜像标签（默认: `1.0.0`）
- `TPL_SSR_IMAGE_REGISTRY`: 镜像仓库地址（默认: `harbor.sunmoonai.com:30443`）
- `TPL_SSR_IMAGE_PROJECT`: 镜像项目名（默认: `k8s-images`）
- `PUSH_IMAGES_AFTER_BUILD`: 是否在构建后自动推送（默认: `false`）
- `CONTAINER_RUNTIME`: 容器运行时选择（默认: `docker`）
  - `docker`: 使用 docker 命令
  - `sudo nerdctl` 或 `nerdctl`: 使用 sudo nerdctl 命令（适用于 containerd 环境）
- `NERDCTL_NAMESPACE`: nerdctl 命名空间（默认: `k8s.io`，仅在 CONTAINER_RUNTIME 为 nerdctl 时生效）
  - `k8s.io`: Kubernetes 命名空间（推荐，用于与 Kubernetes 共享镜像）
  - `default`: 默认命名空间

### 镜像仓库配置

推送镜像前，请确保已登录镜像仓库：

```bash
# 使用 docker
docker login harbor.sunmoonai.com:30443

# 或使用 nerdctl
sudo nerdctl login harbor.sunmoonai.com:30443
```

## 注意事项

1. **源代码位置**：源代码在项目根目录的 `app/` 目录，无需手动复制
2. **依赖管理**：项目使用 pnpm 管理依赖，确保 `package.json` 和 `pnpm-lock.yaml` 存在于 `app/` 目录中
3. **构建上下文**：构建时在项目根目录执行，使用 `-f mybuild/Dockerfile` 指定 Dockerfile，Dockerfile 中的 `COPY app/` 会从构建上下文（项目根目录）复制
4. **版本控制**：`mybuild/` 目录应该在版本控制中，这样可以确保构建配置和代码同步
5. **镜像分离**：镜像构建和部署已完全分离，构建使用 `build-image.sh`，部署使用 `deploy-tpl-frontend.sh`
