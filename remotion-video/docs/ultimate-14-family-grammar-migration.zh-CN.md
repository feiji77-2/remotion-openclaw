# Ultimate 14 对象语法迁移清单

目标：把剩余 14 个对象从“会动的信息面板”迁移成“导演级记忆物镜头”。
核心结论：不要继续按 family 单独找样式，而是强制并回 4 种母语法。

## 0. 四种母语法（唯一母体）

1. 路径推进
   - 参考母体：`feature-rail` / `step-flow` / `timeline` / `pipeline-flow`
   - 关键词：trace / rail / chase / reveal
   - 记忆物类型：`line` / `beam`

2. 中心核外放
   - 参考母体：`evidence-wall` / `architecture-map` / `memory-graph`
   - 关键词：nucleus / lock-on / burst / pin
   - 记忆物类型：`node` / `ring` / `beam` / `word`

3. 曲线竞速
   - 参考母体：`benchmark-chart`
   - 关键词：race / clash / overtake / threshold
   - 记忆物类型：`axis` / `line`

4. 主核 + 卫星轨道
   - 参考母体：`number-strip`
   - 关键词：orbit / satellite / field / constellation
   - 记忆物类型：`ring` / `node` / `word`

禁止项：
- 禁止继续新增“某个 family 专属容器壳”
- 禁止把文本重新堆成左右栏、矩阵、卡片墙
- 禁止默认用同一套 stage / overlay / camera 粗暴复用

## 1. 必补的 5 个视觉原子

先做原子，再改 family。文件全部放到 `remotion-video/src/components/visual-atoms/`。

### 1.1 `ReticleLockOn.tsx`
用途：`focus` / `hero` / `cta`
加什么：
- 同心准星
- 锁定 pulse
- 中心词语高亮框
- 外圈轻微扫描
删什么：
- 不要做成完整 HUD 面板
同时修改：
- `remotion-video/src/components/visual-atoms/index.ts` 导出

### 1.2 `SplitAxisClash.tsx`
用途：`compare-board`
加什么：
- 左右两条相向路径
- 节点推进
- 中心碰撞点 / 越线点
- 轴线或阈值线
删什么：
- 不要表格格线
- 不要 VS 圆章占据主视觉
同时修改：
- `visual-atoms/index.ts` 导出

### 1.3 `OrbitLabels.tsx`
用途：`number-strip` / `metrics` / `tag-matrix` / `glossary-term`
加什么：
- 1 主核 + 2~6 卫星标签
- 弧线排版
- 轨道角速度 / 相位差
- 标签远近层次
删什么：
- 不要平均网格
同时修改：
- `visual-atoms/index.ts` 导出

### 1.4 `CodeTraceSweep.tsx`
用途：`code` / `terminal`
加什么：
- 光标扫线
- 路径描边
- 单行锁定
- 关键 token 辉光
删什么：
- 不要完整 IDE / 终端皮肤作为主体
同时修改：
- `visual-atoms/index.ts` 导出

### 1.5 `ShockwaveWord.tsx`
用途：`quote-highlight` / `cta` / `hero`
加什么：
- 单词爆发
- 爆发后余震停留
- 出血放大
- 背景静止时的 residual glow
删什么：
- 不要用标签 chip 代替高潮
同时修改：
- `visual-atoms/index.ts` 导出

## 2. 共享调度文件：必须一起动

### 2.1 `remotion-video/src/components/ultimate-kit/types.ts`
要加：
- 为以下 family 增加最小新 props，避免把导演语法硬编码在 JSX 里：
  - `UltimateHeroPanelProps`: `memoryObjectType?`, `lockOnWord?`, `monumentAlign?`
  - `UltimateFocusDiagramProps`: `lockOnStyle?`, `lockedSideNote?`
  - `UltimateCompareBoardProps`: `mode?`, `collisionLabel?`, `thresholdLabel?`
  - `UltimateTagMatrixProps`: `clusters?`, `orbitMode?`
  - `UltimateCodePanelProps`: `traceLines?`, `focusToken?`
  - `UltimateMetricBarsProps`: `layout?: 'bars' | 'cards' | 'orbit'`
  - `UltimateTerminalPanelProps`: `outputMode?: 'panel' | 'beam'`
  - `UltimateQuoteHighlightProps`: `shockWord?`, `pinLabel?`
  - `UltimateGlossaryTermProps`: `termOrbitMode?`
  - `UltimateCtaPanelProps`: `actionVerb?`, `lockOnTarget?`
- 为 `UltimateStageProps` 增加 `stagePreset?`

### 2.2 `remotion-video/src/data/registry.ts`
要改：
- 不再把 P0/P1 family 当“容器类 family”描述，改成“语法类 family”描述
- 调整 `semanticTags` / `timing.cameraMotion` / `defaultTransition` / `stageConfig`
- 给以下 family 设置新的默认语义：
  - `hero` → `push-in` / opening stage
  - `focus` → `push-in` / lock-on stage
  - `compare-board` → `pan-x` 或追击式 race stage
  - `tag-matrix` → `drift` + orbit stage
  - `code` / `terminal` → `none` 或轻 chase，但由 trace 原子负责主体动作
  - `quote-highlight` / `cta` → `none` 或轻 push-in，避免镜头抢戏
- `stageConfig` 不再大量 `null`，开始按 opening / data / evidence / climax / cta 预设分配

### 2.3 `remotion-video/src/data/shotGrammar.ts`
要改：
- 新增“family → 母语法 → archetype”的硬映射，不再只靠宽泛 fallback
- P0/P1 建议绑定：
  - `hero` → `lock-on reveal` + `pin`
  - `focus` → `lock-on reveal` + `pin`
  - `compare-board` → `compress compare` 或 `overtake race`
  - `tag-matrix` → `burst spread`
  - `code` → `trace flow`
  - `metrics` → `pressure countdown` / `threshold breach`
  - `terminal` → `trace flow`
  - `quote-highlight` → `aftershock hold`
  - `glossary-term` → `lock-on reveal`
  - `cta` → `aftershock hold` 或 `lock-on reveal`
- 增强 `CAMERA_INTENT_TO_MOTION` 的注释，明确：语义层优先，family 只兜底

### 2.4 `remotion-video/src/data/storyboardLoader.ts`
要改：
- `resolveTransition(shot)` 不能再只按 `family + level`，要让 `grammar.archetype` 参与
- `buildSceneData()` 把新增 props 从 `visualProps` 映射到具体 family data
- `shotsToScenes()` 保留 `grammar`，并把 `stagePreset` / `outputMode` / `orbitMode` 等安全下发

### 2.5 `remotion-video/src/components/ultimate-kit/UltimateSceneTransition.tsx`
要改：
- 不再按 opening/data/climax 这类 family 粗分派发 camera
- 直接优先读 `scene.grammar.archetype` 与 `scene.grammar.cameraIntent`
- transition grammar 直接绑定：
  - `lock-on reveal` → `fade` / `wipe`
  - `compress compare` / `overtake race` → `slide` / `wipe`
  - `aftershock hold` → `fade`
  - `threshold breach` → `clock-wipe` 或 `flash`
- 保留 `scene.transition` 作为最终 override

### 2.6 `remotion-video/src/components/camera/CameraDirector.tsx`
要改：
- 继续保留技术 preset：`push-in` / `pan-x` / `pan-y` / `drift` / `none`
- 但文档与调用层改成语义派发：`push / chase / drift / hold`
- `hold` 最小实现可先复用 `none`
- 避免 `zoom-pulse` 滥用到非数据高潮段

### 2.7 `remotion-video/src/compositions/UltimateSceneTemplate.tsx`
要改：
- `UltimateStage` 增加 `stagePreset`
- overlay 渲染继续走 `scene.stageConfig`，但默认策略改成 selective HUD
- 继续保留 `data-grammar` 标记，方便 snapshot/QA 验证

## 3. P0：先改的 6 个（按顺序）

## 3.1 `hero`
主文件：`remotion-video/src/components/ultimate-kit/families/UltimateHeroPanel.tsx`

现在要删：
- 顶部 `kicker/badge` + 中部大标题 + 底部说明的传统 banner 分层感
- 过于规整的左对齐封面版式

现在要加：
- `ShockwaveWord`：标题中的一个关键词爆发出血
- `ReticleLockOn` 或单枚 `ring/beam`：作为记忆物
- 标题 monument 化：更大、更出血、更少容器痕迹
- 副标题降级到边缘注释层

同时修改：
- `types.ts`：补 `lockOnWord?`, `memoryObjectType?`
- `shotGrammar.ts`：绑定 `lock-on reveal`
- `registry.ts`：opening stage / `push-in`

先后顺序：
1. 先接 `ShockwaveWord`
2. 再压缩标题版式
3. 最后清退旧 badge / avatar 视觉主导权

## 3.2 `focus`
主文件：`remotion-video/src/components/ultimate-kit/families/UltimateFocusDiagram.tsx`

现在要删：
- `question + description` 仍与 `keyword` 同权并排
- `diagram === framing/rings/scale` 的“解释图”思路继续当主体

现在要加：
- `ReticleLockOn` 作为唯一主语法
- `keyword` 变被锁定物
- 说明文字退到右侧或边缘旁注
- 如果保留 diagram，只能当背景辅助层

同时修改：
- `types.ts`：补 `lockOnStyle?`, `lockedSideNote?`
- `shotGrammar.ts`：强绑 `lock-on reveal`

先后顺序：
1. 先把 `keyword` 提到画面中心主角
2. 再把 `description` 退侧边
3. 最后把旧 diagram 降为背景层

## 3.3 `compare-board`
主文件：`remotion-video/src/components/ultimate-kit/families/UltimateCompareBoard.tsx`

现在要删：
- 左右标题面板
- 中间 `VS` 圆章主导
- 底部三行网格式对照卡

现在要加：
- `SplitAxisClash`
- 两条相向轨迹 + 两组节点
- 中心碰撞点 / 越线点
- 行信息降成附着在路径上的标签，而不是网格卡片

同时修改：
- `types.ts`：补 `mode?: 'table' | 'clash'`, `collisionLabel?`, `thresholdLabel?`
- `shotGrammar.ts`：优先 `compress compare`，有数值超车时切 `overtake race`
- `registry.ts`：transition 改偏 `slide/wipe`

先后顺序：
1. 先去掉旧三列 row grid
2. 再立轴线/相向轨迹
3. 最后把每一行内容附着到轨迹节点

## 3.4 `tag-matrix`
主文件：`remotion-video/src/components/ultimate-kit/families/UltimateTagMatrix.tsx`

现在要删：
- tab 胶囊 + 主区网格 + 次级标签云的矩阵逻辑
- 同屏等权标签

现在要加：
- `OrbitLabels`
- 2~3 个类别核
- 标签围核成星座分布
- 类别间用弧线 / 连线做分群

同时修改：
- `types.ts`：补 `clusters?`, `orbitMode?`
- `shotGrammar.ts`：绑定 `burst spread`
- `registry.ts`：`drift` / orbit stage

先后顺序：
1. 先把 `items` 从 grid 改成 cluster 数据模型
2. 再上 orbit 原子
3. 最后再决定 tab 是否保留为弱导航

## 3.5 `code`
主文件：`remotion-video/src/components/ultimate-kit/families/UltimateCodePanel.tsx`

现在要删：
- 左侧事实卡 + 右侧大代码框的双栏面板逻辑
- 文件头完整 IDE 感

现在要加：
- `CodeTraceSweep`
- 只留 3~6 行关键代码
- 一条光标扫线 + 路径描边 + 单行锁定
- 代码成为证据，不是容器主体

同时修改：
- `types.ts`：补 `traceLines?`, `focusToken?`
- `shotGrammar.ts`：绑定 `trace flow`
- `registry.ts`：terminal/code 类 overlay 默认关闭保持不变

先后顺序：
1. 先裁剪行数
2. 再接 trace 原子
3. 最后删除左侧 facts 面板或降级为角落 pin

## 3.6 `metrics`
主文件：`remotion-video/src/components/ultimate-kit/families/UltimateMetricBars.tsx`

现在要删：
- `cards` / `bars` 的平均并列逻辑
- 多个等权环 / 多个等权卡

现在要加：
- `OrbitLabels`
- 1 主环 + 2~3 副环
- 主 KPI 做核心，其他值围绕运行
- 弧线关系代替等分列表

同时修改：
- `types.ts`：`layout` 扩成 `'bars' | 'cards' | 'orbit'`
- `shotGrammar.ts`：按数值类型切 `pressure countdown` 或 `threshold breach`
- `registry.ts`：data stage

先后顺序：
1. 先新建 orbit layout 分支
2. 再把最大 KPI 识别成主核
3. 最后退役平均卡片视图

## 4. P1：第二批 4 个

## 4.1 `terminal`
主文件：`remotion-video/src/components/ultimate-kit/families/UltimateTerminalPanel.tsx`

删什么：
- macOS 终端窗口皮肤作为主体
- 完整窗口 chrome

加什么：
- `CodeTraceSweep`
- command 当点火动作
- output 变成向下流动的信号列 / beam
- `note` 只做底部 pin

同时修改：
- `types.ts`：补 `outputMode?: 'panel' | 'beam'`
- `shotGrammar.ts`：绑定 `trace flow`

## 4.2 `quote-highlight`
主文件：`remotion-video/src/components/ultimate-kit/families/UltimateQuoteHighlight.tsx`

删什么：
- 多个 tags 作为情绪主体
- 完整 quote card 心智

加什么：
- `ShockwaveWord`
- 只保留一句判断
- 一个词出血放大
- attribution 变小 pin

同时修改：
- `types.ts`：补 `shockWord?`, `pinLabel?`
- `shotGrammar.ts`：强绑 `aftershock hold`

## 4.3 `glossary-term`
主文件：`remotion-video/src/components/ultimate-kit/families/UltimateGlossaryTerm.tsx`

删什么：
- 左术语卡 + 右定义卡的双栏解释板

加什么：
- `term` 做主体 monument
- `OrbitLabels` 负责音标/相关词环绕
- definition 退成旁注

同时修改：
- `types.ts`：补 `termOrbitMode?`
- `shotGrammar.ts`：绑定 `lock-on reveal`

## 4.4 `cta`
主文件：`remotion-video/src/components/ultimate-kit/families/UltimateCtaPanel.tsx`

删什么：
- highlights 三列亮点卡
- 搜索框式尾页信息板

加什么：
- `ReticleLockOn` + `ShockwaveWord`
- 只留一个动作动词 / 一句命令
- 一个方向性 wipe 收束到按钮或链接位置

同时修改：
- `types.ts`：补 `actionVerb?`, `lockOnTarget?`
- `shotGrammar.ts`：绑定 `aftershock hold` 或 `lock-on reveal`
- `registry.ts`：cta stage / `fade`

## 5. P2：壳层 4 个

## 5.1 `UltimateStage`
主文件：`remotion-video/src/components/ultimate-kit/families/UltimateStage.tsx`

改法：
- 引入 `stagePreset`
- 预设至少 5 套：`opening` / `data` / `evidence` / `climax` / `cta`
- 只负责调用，不再内含统一舞台审美

联动：
- `types.ts`
- `project.ts`
- `UltimateSceneTemplate.tsx`

## 5.2 `UltimateBackdrop` + `ParticleBackground`
主文件：
- `remotion-video/src/components/ultimate-kit/families/UltimateBackdrop.tsx`
- `remotion-video/src/components/ParticleBackground.tsx`

改法：
- 每个 `stagePreset` 只允许 1~2 类背景原子
- 禁止粒子 / rays / dot-grid 同屏全开
- 背景生命周期跟 scene phase 绑定，不再只看 family

## 5.3 `UltimatePlatformOverlay`
主文件：`remotion-video/src/components/ultimate-kit/families/UltimatePlatformOverlay.tsx`

改法：
- selective HUD：
  - terminal / code / data 默认可开
  - hero / focus / quote / cta 默认关
- overlay 只能做工具感，不准抢主记忆物

联动：
- `registry.ts` stageConfig
- `UltimateSceneTemplate.tsx` overlay gate

## 5.4 `UltimateSceneTransition` + `CameraDirector`
主文件：
- `remotion-video/src/components/ultimate-kit/UltimateSceneTransition.tsx`
- `remotion-video/src/components/camera/CameraDirector.tsx`

改法：
- archetype 直接绑定 transition/camera grammar
- 不再按 family 粗暴推导 opening/data/climax
- 建议最小映射：
  - `lock-on reveal` → `fade` / `push`
  - `compress compare` → `slide` / `push`
  - `overtake race` → `wipe` / `chase`
  - `aftershock hold` → `fade` / `hold`
  - `threshold breach` → `clock-wipe` / `push`

## 6. 推荐执行顺序（必须按这个来）

1. 先做 5 个视觉原子
2. 再改 `types.ts`
3. 再改 `shotGrammar.ts` / `registry.ts` / `storyboardLoader.ts`
4. 再改 P0：`hero` → `focus` → `compare-board` → `tag-matrix` → `code` → `metrics`
5. 再改 P1：`terminal` → `quote-highlight` → `glossary-term` → `cta`
6. 最后改 P2：`UltimateStage` / `UltimateBackdrop` / `UltimatePlatformOverlay` / `UltimateSceneTransition` / `CameraDirector`
7. 每改完一类就跑 snapshot，不要 14 个一起改

## 7. 快照 / QA 硬标准

每个模块升级后都要过 5 条：

1. 主角是不是一个记忆物，而不是一个框
2. 视线路径是不是一眼可读，而不是平均分布
3. 文字是不是退到标签/注释层，而不是继续当容器
4. 镜头动作是不是有语义，不是默认平移
5. 截一张静帧，1 秒内能不能说出“这张图在拍什么”

附加验证点：
- `compare-board`：静帧必须能看出“对撞 / 越线”
- `tag-matrix`：静帧必须能看出“核 + 星座分群”
- `code` / `terminal`：静帧必须能看出“哪一行 / 哪个 token 是证据”
- `quote-highlight` / `cta`：静帧必须能看出“哪个词是冲击点”

## 8. 最值得先下手

第一优先：
1. `compare-board`
2. `tag-matrix`

原因：
- 这两类最容易退回“会动的信息面板”
- 一旦改对，会最快把整套系统从 family collection 拉成 director grammar system
