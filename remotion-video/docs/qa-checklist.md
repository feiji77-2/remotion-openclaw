# QA Checklist — UltimateSceneTemplate 视频验收

> 来源：`shellbot-video-generator-1` 6-item QA 清单 + 本项目实测经验

## 渲染前检查（Pre-Render）

### 1. 数据完整性
- [ ] `project.json` 中所有 `scene.id` 全局唯一，无重复
- [ ] 每个 scene 的 `durationInFrames` 与相邻 scene 的 `transition.durationInFrames` 之和连续不断档
- [ ] `audioSegments` 的 `startFrame` 按升序排列，`durationInFrames` > 0

### 2. 分镜 family 覆盖
- [ ] 20 个 family **均有**对应 fixture 或真实数据
- [ ] 不存在硬编码 fallback 到 `hero` 的隐式降级
- [ ] `registry.ts` 中的 `timing` / `transitions` / `stage` 配置与 scene 的 `family` 匹配

### 3. 资源路径
- [ ] `voiceFile` / `mediaSrc` 为绝对 URL 或 `staticFile()` 合规相对路径
- [ ] 图标 URL（`iconPack`）均有网络可达性
- [ ] `audioSegments[].src` 与 `voiceFile` 不同时，两者路径均已验证

---

## 渲染后检查（Post-Render）

### 4. 播放流畅性（Mute / Squint / Loop）
> 将 MP4 静音播放，全屏眯眼看整体节奏感，不依赖声音判断内容。

- [ ] **静音播放 3 次** — 无首帧跳帧、无循环断点
- [ ] **眯眼测试** — 场景切换处无明显"跳切"感，过渡动画连贯
- [ ] **无限循环** — 起点/终点衔接无重影

### 5. 内容一致性（Consistency / Slideshow）
- [ ] **字幕与语音同步** — 使用 `@remotion/captions` 词级时间戳时，`startFrame` 与音频实际发音对齐
- [ ] **数据无越界** — 对比表格、图表数值与 `project.json` 中的 `rows[]` / `items[]` 完全一致
- [ ] **图标不穿帮** — `UltimateIconOrbit` 组件中图标无拉伸、截断

### 6. 视觉质量（Timing / Hard弹）

| 检查点 | 期望 | 异常表现 |
|---|---|---|
| 场景入场动画 | 微弹（snappy spring，`stiffness 400`） | 软趴趴（ stiffness 100 感） |
| 数字/标签滑入 | `snappy` 0.2–0.4s | 过慢（standard 0.5s+） |
| 转场时长 | 20–40 帧（~1s） | 过短（<15帧）或过长（>60帧） |
| UI 元素悬停/点击态 | 有 `premountFor` 预加载，无首帧跳帧 | 首帧跳帧、音频提前结束 |
| 音量曲线 | 有淡入淡出（`volume={(f)=>...}`） | 爆音或突兀起止 |

### 7. 平台合规

- [ ] **9:16 竖屏** — 分辨率 1080×1920，无黑边
- [ ] **码率** — H.264，目标 8–12 Mbps（竖屏 60s 视频约 60–90 MB）
- [ ] **音频** — AAC 48kHz，单轨，无爆音

---

## Storyboard QA 专项（`--with-storyboard-qa`）

- [ ] QA manifest 写入 `qa/storyboard/storyboard-manifest.json`（路径已统一）
- [ ] QA 图片写入 `qa/storyboard/images/`，**不污染** `public/assets/<projectId>/images/`
- [ ] QA 与 Build 使用**同一份** `image-prompts.json`（无旧数据干扰）
- [ ] `phaseRegistry` 聚合状态以 `every()` 判定，非单个 step 触发

---

## Visual Regression（`scripts/snapshots.mts`）

```bash
# 1. 建立 baseline
npx tsx scripts/snapshots.mts render

# 2. 对比
npx tsx scripts/snapshots.mts diff

# 3. 清理
npx tsx scripts/snapshots.mts clean
```

| Hamming 距离 | 判定 | 动作 |
|---|---|---|
| 0 | ✅ identical | 直接通过 |
| 1–4 | ⚠ minor | 人工审核截图 |
| > 4 | ❌ significant | 确认是否预期改动，否则回退 |

> **阈值校准**：首次跑 `render` 后，在 `__snapshots__/families/<family>/` 目录查看截图，积累 3+ 版本后根据实际 diff 分布调整阈值。初期保守值 `4`，稳定后可收紧至 `2`。

---

## 快速验收脚本

```bash
# 完整流水线冒烟（不渲染，不出图，不配音）
node scripts/run-search-to-ultimate.mjs \
  --resume \
  --with-storyboard-qa \
  --no-render \
  --no-voice \
  --no-images

# 检查输出
cat projects/<projectId>/run-report.json | python3 -m json.tool | grep -E '"phase"|"storyboardQa"|"status"'
```
