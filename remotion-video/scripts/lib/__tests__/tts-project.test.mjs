import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const hasFfmpeg = () => spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;

describe("generate-tts-for-project", () => {
  it("fails clearly in production mode when no TTS key is configured", () => {
    const fixtureDir = mkdtempSync(path.join(tmpdir(), "tts-project-missing-key-"));
    try {
      const projectJsonPath = path.join(fixtureDir, "project.json");
      writeFileSync(
        projectJsonPath,
        JSON.stringify({
          schemaVersion: 1,
          projectId: "tts-missing-key",
          title: "TTS Missing Key",
          render: { fps: 30, width: 1080, height: 1920 },
          scenes: [{ durationInFrames: 30 }],
          captions: [
            {
              text: "正常生产链路必须有真实语音合成。",
              startMs: 0,
              endMs: 1000,
              timestampMs: 0,
              confidence: 1,
            },
          ],
          audio: {},
          assets: {},
        }),
      );

      const result = spawnSync(
        process.execPath,
        [
          path.join(projectRoot, "scripts/generate-tts-for-project.mjs"),
          projectJsonPath,
        ],
        {
          cwd: projectRoot,
          encoding: "utf8",
          env: {
            ...process.env,
            DASHSCOPE_API_KEY: "",
            QWEN_TTS_API_KEY: "",
            VIDEO_FACTORY_SKIP_TTS: "",
          },
        },
      );

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("正常生产链路需要 DASHSCOPE_API_KEY 或 QWEN_TTS_API_KEY");
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it("writes a voiceover asset into asset-pack.json in explicit test mode", () => {
    if (!hasFfmpeg()) return;

    const projectId = `tts-unit-${Date.now()}`;
    const fixtureDir = mkdtempSync(path.join(tmpdir(), "tts-project-"));
    const publicProjectDir = path.join(projectRoot, "public/projects", projectId);
    try {
      const projectJsonPath = path.join(fixtureDir, "project.json");
      const assetPackPath = path.join(fixtureDir, "asset-pack.json");
      writeFileSync(
        projectJsonPath,
        JSON.stringify({
          schemaVersion: 1,
          projectId,
          title: "TTS Unit",
          render: { fps: 30, width: 1080, height: 1920 },
          scenes: [{ durationInFrames: 30 }],
          captions: [
            {
              text: "测试语音合成链路。",
              startMs: 0,
              endMs: 1000,
              timestampMs: 0,
              confidence: 1,
            },
          ],
          audio: {},
          assets: {},
        }),
      );
      writeFileSync(
        assetPackPath,
        JSON.stringify({ productionId: projectId, assets: [] }),
      );

      const result = spawnSync(
        process.execPath,
        [
          path.join(projectRoot, "scripts/generate-tts-for-project.mjs"),
          projectJsonPath,
          "--asset-pack",
          assetPackPath,
        ],
        {
          cwd: projectRoot,
          encoding: "utf8",
          env: {
            ...process.env,
            VIDEO_FACTORY_SKIP_TTS: "1",
            DASHSCOPE_TTS_VOICE: "qwen-tts-vc-bailian-voice-test",
            DASHSCOPE_TTS_MODEL: "",
            QWEN_TTS_MODEL: "",
            QWEN_TTS_CLONE_MODEL: "qwen3-tts-vc-2026-01-22",
          },
        },
      );

      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(result.stdout).toContain("[tts] 模型: qwen3-tts-vc-2026-01-22");
      expect(
        existsSync(path.join(publicProjectDir, "audio/voice.m4a")),
      ).toBe(true);
      const assetPack = JSON.parse(readFileSync(assetPackPath, "utf8"));
      expect(assetPack.assets).toEqual([
        expect.objectContaining({
          id: "voiceover",
          kind: "audio",
          src: `projects/${projectId}/audio/voice.m4a`,
          required: true,
          source: "tts",
          fileName: "voice.m4a",
          contentType: "audio/mp4",
        }),
      ]);
      expect(assetPack.assets[0].size).toBeGreaterThan(0);
      expect(assetPack.assets[0].durationMs).toBeGreaterThan(0);
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
      rmSync(publicProjectDir, { recursive: true, force: true });
    }
  });
});
