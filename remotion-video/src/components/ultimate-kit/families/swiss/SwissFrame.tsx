/**
 * SwissFrame — Swiss 系列统一骨架
 *
 * 提供顶栏(左编号 / 右标识)、底栏(左来源 / 右章节进度)、粗网格背景、Assert<white> 根。
 * 所有 Swiss* 组件包一层 <SwissFrame index="01" total={16} id="SWISS-SKILL" source="...">...</SwissFrame>
 * 确保 16 cut 视觉同构（同一套页眉页脚 + 粗网格 + 白底黑字）。
 *
 * 这是口播论点的物化：成片本身拒绝紫色渐变居中堆叠毛玻璃，用 Swiss 出片。
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {
  swissRootStyle,
  swissGridStyle,
  swissTopBarStyle,
  swissBottomBarStyle,
  swissColor,
  swissFont,
  swissType,
} from './SwissTokens';

interface SwissFrameProps {
  /** 当前 scene 在整片里的序号，形如 "01"。 */
  index: string;
  /** 总 cut 数，形如 16。 */
  total: number;
  /** 右上角标识符（系列固定值）。 */
  id?: string;
  /** 左下角来源/出处。 */
  source?: string;
  /** 右下角分章标题。 */
  chapter?: string;
  /** 是否隐藏粗网格底纹（默认显示）。 */
  hideGrid?: boolean;
  children: React.ReactNode;
}

export const SwissFrame: React.FC<SwissFrameProps> = ({
  index,
  total,
  id = 'SWISS · ANTI-AVERAGE',
  source,
  chapter,
  hideGrid = false,
  children,
}) => {
  const totalStr = String(total).padStart(2, '0');
  return (
    <AbsoluteFill style={swissRootStyle()}>
      {/* 粗网格底纹 */}
      {!hideGrid && <AbsoluteFill style={swissGridStyle()} />}

      {/* 顶栏：左编号 / 右标识 */}
      <AbsoluteFill style={{...swissTopBarStyle(), position: 'absolute', left: 120, right: 120, top: 96, bottom: 'auto'} as React.CSSProperties}>
        <span style={{color: swissColor.ink}}>{index} / {totalStr}</span>
        <span style={{color: swissColor.red}}>{id}</span>
      </AbsoluteFill>

      {/* 主内容容器（在顶栏之下、底栏之上） */}
      <AbsoluteFill style={{
        position: 'absolute',
        inset: 0,
        padding: '180px 120px 180px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        {children}
      </AbsoluteFill>

      {/* 底栏：左来源 / 右章节 */}
      <AbsoluteFill style={swissBottomBarStyle() as React.CSSProperties}>
        <span style={{color: swissColor.inkMute}}>{source ?? '—'}</span>
        <span style={{color: swissColor.ink, fontFamily: swissFont.sans, fontSize: swissType.kicker, letterSpacing: 2}}>
          {chapter ?? ''}
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
