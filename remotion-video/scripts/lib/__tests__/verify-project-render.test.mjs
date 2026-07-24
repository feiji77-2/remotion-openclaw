import {spawnSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const verifier = path.join(projectRoot, 'scripts/verify-project-render.mjs');
const hasFfmpeg = () => spawnSync('ffmpeg', ['-version'], {stdio: 'ignore'}).status === 0;

describe('verify-project-render voice contract', () => {
  it('accepts synchronized voice video and rejects an otherwise valid silent MP4', () => {
    if (!hasFfmpeg()) return;
    const root = mkdtempSync(path.join(tmpdir(), 'verify-voice-'));
    const projectId = `verify-voice-${Date.now()}`;
    const publicAudioDir = path.join(projectRoot, 'public', 'projects', projectId, 'audio');
    try {
      mkdirSync(publicAudioDir, {recursive: true});
      const voice = path.join(publicAudioDir, 'voice.m4a');
      const voicedVideo = path.join(root, 'voiced.mp4');
      const silentVideo = path.join(root, 'silent.mp4');
      const projectFile = path.join(root, 'project.json');
      expect(spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '1', '-c:a', 'aac', voice], {stdio: 'ignore'}).status).toBe(0);
      expect(spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=black:s=64x64:r=30', '-i', voice, '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', voicedVideo], {stdio: 'ignore'}).status).toBe(0);
      expect(spawnSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=black:s=64x64:r=30', '-t', '1', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', silentVideo], {stdio: 'ignore'}).status).toBe(0);
      writeFileSync(projectFile, JSON.stringify({
        schemaVersion: 1,
        render: {fps: 30, width: 64, height: 64},
        scenes: [{durationInFrames: 30}],
        captions: [{text: '同步语音', startMs: 0, endMs: 1000}],
        audio: {voiceAssetId: 'voiceover'},
        assets: {voiceover: {kind: 'audio', src: `projects/${projectId}/audio/voice.m4a`, required: true}},
      }));

      const valid = spawnSync(process.execPath, [verifier, '--props', projectFile, '--video', voicedVideo], {encoding: 'utf8', cwd: projectRoot});
      const silent = spawnSync(process.execPath, [verifier, '--props', projectFile, '--video', silentVideo], {encoding: 'utf8', cwd: projectRoot});
      expect(valid.status, valid.stderr || valid.stdout).toBe(0);
      expect(silent.status).toBe(1);
      expect(silent.stderr).toContain('voice project output has no audio stream');
    } finally {
      rmSync(root, {recursive: true, force: true});
      rmSync(path.join(projectRoot, 'public', 'projects', projectId), {recursive: true, force: true});
    }
  });
});
