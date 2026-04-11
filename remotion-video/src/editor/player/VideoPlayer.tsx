/**
 * VideoPlayer — Remotion Player 预览组件
 * 参照 designcombo 的 Player 集成模式
 *
 * 使用 @remotion/player 预览 timeline 状态
 */
import React, { useImperativeHandle, forwardRef, useRef } from 'react';
import {
  Player,
  PlayerRef,
} from '@remotion/player';
import '@remotion/player/layout';
import {useCurrentFrame} from 'remotion';
import type { IDesign, ITrackItem } from '../types';
import {
  buildCaptionStyleFromTrackItem,
  buildSubtitleCueFromTrackItem,
  SharedCaptionBubble,
} from '../../components/DesignCaptionText';

// ── Remotion 组件 props ──
export type RemotionCompositionProps = {
  design: IDesign;
  currentFrame: number;
};

// ── Shot 组件（对应 timeline 中的一个视频/图片轨道项目）─
const ShotItem: React.FC<{
  item: ITrackItem;
  design: IDesign;
}> = ({ item, design }) => {
  const { type, details, start, duration } = item;
  const frame = useCurrentFrame();
  const itemStart = Math.max(0, Math.round(start || 0));
  const itemEnd = itemStart + Math.max(1, Math.round(duration || 1));

  if (frame < itemStart || frame >= itemEnd) {
    return null;
  }

  if (type === 'image' && details.type === 'image') {
    return (
      <div
        style={{
          position: 'absolute',
          top: details.top,
          left: details.left,
          width: details.width,
          height: details.height,
          opacity: details.opacity / 100,
          transform: details.transform,
          filter: `blur(${details.blur}px) brightness(${details.brightness}%)`,
        }}
      >
        {details.src ? (
          <img
            src={details.src}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: details.borderRadius }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: details.borderRadius,
            }}
          />
        )}
      </div>
    );
  }

  if (type === 'video' && details.type === 'video') {
    return (
      <div
        style={{
          position: 'absolute',
          top: details.top,
          left: details.left,
          width: details.width,
          height: details.height,
          opacity: details.opacity / 100,
        }}
      >
        {details.src ? (
          <video
            src={details.src}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: details.borderRadius }}
            muted={false}
          />
        ) : (
          // 纯色背景占位
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(180deg, #0c0c0e 0%, #1c1c2e 100%)',
            }}
          />
        )}
      </div>
    );
  }

  return null;
};

// ── 字幕覆盖层（打字机 + SRT 词级同步）─
const CaptionOverlay: React.FC<{
  item: ITrackItem;
  design: IDesign;
}> = ({ item, design }) => {
  if (item.details.type !== 'caption') return null;
  const frame = useCurrentFrame();
  const subtitleCue = buildSubtitleCueFromTrackItem(item, design.fps);
  const captionStyle = buildCaptionStyleFromTrackItem(item, design.width);

  if (!subtitleCue || frame < subtitleCue.startFrame || frame >= subtitleCue.endFrame) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      <SharedCaptionBubble
        frame={frame}
        fps={design.fps}
        width={design.width}
        subtitleStyle="caption"
        captionText={subtitleCue.text}
        captionStartFrame={subtitleCue.startFrame}
        activeSubtitle={subtitleCue}
        activeCaptionStyle={captionStyle}
        typewriter
      />
    </div>
  );
};

// ── 完整视频合成组件 ──
export const VideoComposition: React.FC<{
  design: IDesign;
}> = ({ design }) => {
  const { width, height, background, tracks, trackItemsMap } = design;

  const videoTrack = tracks.find((t) => t.type === 'video');
  const captionTrack = tracks.find((t) => t.type === 'caption');

  return (
    <div
      style={{
        width,
        height,
        background:
          background.type === 'color'
            ? background.value
            : `url(${background.value}) center/cover`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 视频/图片层 */}
      {videoTrack?.items.map((itemId) => {
        const item = trackItemsMap[itemId];
        if (!item) return null;
        return <ShotItem key={itemId} item={item} design={design} />;
      })}

      {/* 字幕叠加层 */}
      {captionTrack?.items.map((itemId) => {
        const item = trackItemsMap[itemId];
        if (!item) return null;
        return <CaptionOverlay key={itemId} item={item} design={design} />;
      })}
    </div>
  );
};

// ── Player 封装组件 ──
export interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  seekTo: (frame: number) => void;
  getPlayerRef: () => PlayerRef | null;
}

interface VideoPlayerProps {
  design: IDesign;
  playing?: boolean;
  loop?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  (
    {
      design,
      playing = false,
      loop = false,
      style,
      className,
    },
    ref
  ) => {
    const playerRef = useRef<PlayerRef>(null);

    useImperativeHandle(ref, () => ({
      play: () => playerRef.current?.play(),
      pause: () => playerRef.current?.pause(),
      seekTo: (frame: number) => playerRef.current?.seekTo(frame),
      getPlayerRef: () => playerRef.current,
    }));

    // 输入给 Remotion 的 props（必须是 JSON 可序列化的）
    const inputProps = {
      design,
      currentFrame: 0,
    };

    return (
      <div style={style} className={className}>
        <Player
          ref={playerRef}
          component={VideoComposition}
          inputProps={inputProps}
          durationInFrames={design.duration}
          fps={design.fps}
          compositionWidth={design.width}
          compositionHeight={design.height}
          controls={true}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 8,
            overflow: 'hidden',
          }}
          loop={loop}
          playbackRate={1}
          clickToPlay={true}
          doubleClickToFullscreen={true}
        />
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
