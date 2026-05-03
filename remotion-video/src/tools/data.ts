import type {SequenceConfig} from '../data/directorScore';
import {scoreToSequences} from '../data/directorScore';
import {DEEPSEEK_V4_DIRECTOR_SCORE} from '../data/generated/directorScoreSample';
import type {ElementType} from '../data/directorScore';

// ── 内嵌数据 ──

export const SCORE = DEEPSEEK_V4_DIRECTOR_SCORE;
export const SEQUENCES: SequenceConfig[] = scoreToSequences(SCORE);

// ── 类型 ──

export interface TimelineCue {
  elementId: string;
  type: ElementType;
  actId: string;
  shotId: string;
  /** 帧范围  [enterStart, maxEnd] */
  frameRange: [number, number];
  /** 入场段 [enterStart, enterEnd] */
  enterRange: [number, number];
  /** 退场段（可选） */
  exitRange?: [number, number];
  hasLoop: boolean;
  easing?: string;
  effectPreset?: string;
  color: string;
  raw: Record<string, unknown>;
}

const TYPE_COLORS: Record<ElementType, string> = {
  text: '#3b82f6',
  shape: '#10b981',
  image: '#8b5cf6',
  icon: '#f59e0b',
  container: '#6b7280',
  path: '#8b5cf6',
};

const ENERGY_COLORS: Record<string, string> = {
  explosive: '#ef4444',
  high: '#f97316',
  moderate: '#eab308',
  calm: '#3b82f6',
};

export function getEnergyColor(energy: string): string {
  return ENERGY_COLORS[energy] ?? '#6b7280';
}

export function getTypeColor(type: ElementType): string {
  return TYPE_COLORS[type] ?? '#6b7280';
}

// ── 工具函数 ──

/** 获取指定幕的所有 cue（拍平成 TimelineCue[]） */
export function getCuesForAct(actId: string): TimelineCue[] {
  return getTimelineCues().filter((c) => c.actId === actId);
}

/** 获取指定 shot 的摄像机路径 */
export function getCameraPathForShot(shotId: string) {
  for (const act of SCORE.acts) {
    for (const shot of act.shots) {
      if (shot.shotId === shotId) return shot.cameraPath;
    }
  }
  return null;
}

/** 获取所有 cue 的扁平列表 */
export function getTimelineCues(): TimelineCue[] {
  const result: TimelineCue[] = [];
  for (const act of SCORE.acts) {
    for (const shot of act.shots) {
      for (const cue of shot.cues) {
        const enterEnd = cue.enterAtFrame + cue.enterDuration;
        let maxEnd = enterEnd;
        let exitRange: [number, number] | undefined;
        if (cue.exitAtFrame !== undefined && cue.exitDuration !== undefined) {
          const exitEnd = cue.exitAtFrame + cue.exitDuration;
          maxEnd = Math.max(maxEnd, exitEnd);
          exitRange = [cue.exitAtFrame, exitEnd];
        }
        result.push({
          elementId: cue.elementId,
          type: cue.type,
          actId: act.actId,
          shotId: shot.shotId,
          frameRange: [cue.enterAtFrame, maxEnd],
          enterRange: [cue.enterAtFrame, enterEnd],
          exitRange,
          hasLoop: !!cue.loopAnimation,
          easing: cue.easing,
          effectPreset: cue.effectPreset,
          color: getTypeColor(cue.type),
          raw: cue as unknown as Record<string, unknown>,
        });
      }
    }
  }
  return result;
}
