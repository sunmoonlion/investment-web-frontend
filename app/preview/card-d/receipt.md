# 卡 D 交审回执

核对页改成 `web 前端地址 + /zh-CN/workbench/settings#computer`。网页把「我的电脑」放在设置页 `#computer`。没有发布，没有改集群。真实配对的「允许」留到卡 E。

## 实际调用的路径

和后端路由逐字核对过，页面会打这 6 个：

1. `GET /api/workbench/agent/download`
2. `POST /api/workbench/agent/install-command`
3. `POST /api/workbench/agent-pairing/lookup`
4. `POST /api/workbench/agent-pairing/{id}/approve`
5. `POST /api/workbench/agent-pairing/{id}/deny`
6. `POST /api/workbench/sandboxes/relay-identity/rotate`

电脑列表和沙箱状态仍用原来的 `GET /api/workbench/environments`、`GET /api/workbench/sandboxes/provisioned`。

## 失败时给人看的话

- 下载没有包：下载暂未开放
- 下载信息读不出来：下载信息暂时读取失败
- 复制没成功：没有复制成功。请再试一次。
- 点得太快（HTTP 429）：点得太快了，稍等再试
- 码不对、过期，或核对/允许的其他失败：码不对或已过期
- 重新连接时令牌已经变了：接入状态已变化或操作仍在进行

## 旧地址

`/zh-CN/workbench/machines` 预览返回 HTTP 200，页里有指向 `/zh-CN/workbench/settings#computer` 的链接，并在浏览器里换成这个地址。侧栏「我的电脑」和「接入电脑」都指向同一节。

## 三种预览

样例由后端 `tests/test_preview_agent_pairing.py` 打真实路由录进 `preview/fixtures`，主机是 `downloads.example`，批准结果里没有代理令牌。

- 空：`empty.png`（下载暂未开放，还没有电脑接入）
- 全：`full.png`（办公室的电脑在线，三步都完成，可复制安装命令）
- 离线：`offline.png`（家里的电脑离线，连接这一步还没做）

## 已做

- 设置页 `#computer`：在线状态、复制安装命令、连接码、电脑列表、收起的高级（ZIP、解除锁定、重新连接电脑）
- 三步引导按电脑的实际状态打勾，去掉「我已下载」
- 云端沙箱只留拉起、更新、回收
- 旧的我的电脑地址转到这一节
- 前端 Node 24.18 测试通过（含上面这些用例）
- 后端核对页地址的单元测试通过

## 未做

- 没有在真环境点「允许」。卡 B 的后端还没发布，配对 404 留到卡 E
- 后端全套数据库测试没跑：`AGENT_TEST_DATABASE_URL` 和 `DELIVERY_TEST_DATABASE_URL` 都没有设置
- 没有发布，没有改集群
