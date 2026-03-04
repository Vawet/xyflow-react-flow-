# React Flow 性能测试 Demo

基于 **@xyflow/react** 构建的大规模节点画布性能测试页面，模拟 AI 图片/视频生成工作流场景。

## 功能概览

### 节点系统

- **图片节点** — 随机 picsum.photos 缩略图
- **视频节点** — `<video>` 标签，hover 自动播放
- **对比节点** — 左右两张图并排，中间分割线
- 每个节点包含：标题、参数标签、积分消耗、生成时间、进度条
- 选中时显示发光边框动画 + 四角缩放手柄
- hover 时显示操作浮层（下载 / 删除 / 重新生成 / 查看大图）

### 连线系统

- 约 30% 节点随机生成连线
- SVG 流动粒子动画
- 三种颜色区分关系类型：蓝色(参考) / 绿色(变体) / 橙色(融合)
- hover 连线显示关系标签

### 交互

- 左键拖拽框选多个节点，批量移动
- 双击节点弹出详情弹窗（大图 / 视频播放）
- 右键节点显示上下文菜单（查看详情 / 下载 / 重新生成 / 复制 / 删除）
- 滚轮缩放，触控板缩放
- 选中节点后可自由缩放节点尺寸
- 随机打乱布局按钮（带过渡动画）

### 性能监控

- 左上角实时 FPS 计数器（定时采样驱动）
- 显示当前节点数、连线数、帧耗时
- 虚拟化开关（`onlyRenderVisibleElements`）

### 控制面板

- 节点数量切换：100 / 500 / 1000 / 2000
- 节点虚拟化开关
- 随机打乱布局

## 技术栈

| 技术 | 版本 |
|------|------|
| React | 18.x |
| TypeScript | 5.x |
| Vite | 6.x |
| @xyflow/react | 12.x |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 项目结构

```
src/
├── main.tsx                      # 入口
├── App.tsx                       # 主组件（ReactFlow 容器 + 状态管理）
├── App.css                       # 全局样式（深色主题）
├── components/
│   ├── ImageNode.tsx             # 图片节点
│   ├── VideoNode.tsx             # 视频节点
│   ├── CompareNode.tsx           # 对比节点
│   ├── AnimatedEdge.tsx          # 动画连线（流动粒子）
│   ├── ControlPanel.tsx          # 控制面板
│   ├── FpsMonitor.tsx            # FPS 监控器
│   ├── DetailModal.tsx           # 详情弹窗
│   └── ContextMenu.tsx           # 右键菜单
└── utils/
    └── dataGenerator.ts          # 节点 / 连线数据生成
```

## License

MIT
