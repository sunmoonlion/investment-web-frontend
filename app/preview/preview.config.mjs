// 预览的配置：这个应用是谁、用哪几个端口、预览里别的应用在哪。
export const previewConfig = {
  app: 'investment',
  port: 3100,
  nextPort: 3101,
  apps: {
    info: 'http://localhost:3110',
    knowledge: 'http://localhost:3120',
    investment: 'http://localhost:3100',
  },
  // investment 会带人去 info（申请入库）、knowledge（数据目录）
  targets: ['info', 'knowledge'],
  // 没有哪个应用把人带到 investment 来；别的应用「回到原处」用的是登记的地址，不经这里
  sources: {},
  // 刚打开预览时用哪个情景
  defaultScenario: 'full',
}
