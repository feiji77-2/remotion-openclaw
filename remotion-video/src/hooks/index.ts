import {useCurrentFrame, useVideoConfig as useRemotionVideoConfig, Internals} from 'remotion';
import type {SubtitleCue, SubtitleTrack} from '../types';

export function useVideoConfig() {
  const unsafeConfig = Internals.useUnsafeVideoConfig();
  if (unsafeConfig) {
    return {
      ...unsafeConfig,
      durationInSeconds: unsafeConfig.durationInFrames / unsafeConfig.fps,
    };
  }
  return {
    fps: 30,
    height: 1080,
    width: 1920,
    durationInFrames: 900,
    durationInSeconds: 30,
  };
}

export function useCurrentTime() {
  const frame = useCurrentFrame();
  const fps = useVideoConfig().fps;
  return frame / fps;
}

export function useSubtitleTrack(track: SubtitleTrack | null) {
  return track?.cues ?? [];
}

export function useCurrentSubtitle(track: SubtitleTrack | null): SubtitleCue | null {
  const currentTime = useCurrentTime();
  if (!track) return null;
  return track.cues.find((cue) => currentTime >= cue.startTime && currentTime <= cue.endTime) || null;
}

export function framesToSeconds(frames: number, fps: number = 30): number {
  return frames / fps;
}

export function secondsToFrames(seconds: number, fps: number = 30): number {
  return Math.round(seconds * fps);
}
