import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { alignCaptionsToUnits, transcriptSimilarity } from "../../align-captions-from-audio.mjs";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const hasFfmpeg = () => spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;

describe("align-captions-from-audio", () => {
  it("covers leading and between-sentence silence without shortening the voice timeline", () => {
    const captions = alignCaptionsToUnits({
      sourceCaptions: [
        {text: "第一段口播内容", startMs: 0, endMs: 1000},
        {text: "第二段口播内容", startMs: 1000, endMs: 2000},
      ],
      units: [
        {text: "第一段口播内容", startMs: 500, endMs: 2500},
        {text: "第二段口播内容", startMs: 3500, endMs: 9500},
      ],
      audioDurationMs: 10000,
    });

    expect(captions[0].startMs).toBe(0);
    expect(captions[1].startMs).toBe(captions[0].endMs);
    expect(captions.at(-1).endMs).toBe(10000);
  });

  it("rejects uploaded speech that does not match the saved script", () => {
    expect(transcriptSimilarity("这是正确的产品发布口播内容", "今天天气不错我们准备出去旅行")).toBeLessThan(0.18);
    expect(() => alignCaptionsToUnits({
      sourceCaptions: [{text: "这是正确的产品发布口播内容", startMs: 0, endMs: 1000}],
      units: [{text: "今天天气不错我们准备出去旅行", startMs: 0, endMs: 1000}],
      audioDurationMs: 1000,
    })).toThrow(/ASR_TEXT_MISMATCH/);
  });

  it("writes audio-duration-aligned captions in explicit test mode", () => {
    if (!hasFfmpeg()) return;

    const projectId = `align-unit-${Date.now()}`;
    const projectDir = path.join(projectRoot, "tmp", projectId);
    const publicProjectDir = path.join(projectRoot, "public", "projects", projectId);
    try {
      mkdirSync(projectDir, { recursive: true });
      mkdirSync(path.join(publicProjectDir, "audio"), { recursive: true });
      const audioPath = path.join(publicProjectDir, "audio", "voice.m4a");
      const audioResult = spawnSync("ffmpeg", [
        "-y",
        "-f",
        "lavfi",
        "-i",
        "anullsrc=channel_layout=stereo:sample_rate=44100",
        "-t",
        "2.000",
        "-c:a",
        "aac",
        audioPath,
      ], { cwd: projectRoot, stdio: "ignore" });
      expect(audioResult.status).toBe(0);

      writeFileSync(
        path.join(projectDir, "project.json"),
        JSON.stringify({
          schemaVersion: 1,
          projectId,
          title: "Align Unit",
          render: { fps: 30, width: 1080, height: 1920 },
          scenes: [{ durationInFrames: 30 }],
          captions: [
            {
              text: "第一拍。",
              startMs: 0,
              endMs: 500,
              timestampMs: 0,
              confidence: 1,
            },
            {
              text: "第二拍。",
              startMs: 500,
              endMs: 1000,
              timestampMs: 500,
              confidence: 1,
            },
          ],
          audio: {},
          assets: {},
        }),
      );
      writeFileSync(
        path.join(projectDir, "asset-pack.json"),
        JSON.stringify({
          assets: [
            {
              id: "voiceover",
              kind: "audio",
              src: `projects/${projectId}/audio/voice.m4a`,
              required: true,
            },
          ],
        }),
      );

      const result = spawnSync(
        process.execPath,
        [
          path.join(projectRoot, "scripts/align-captions-from-audio.mjs"),
          "--project",
          `tmp/${projectId}/project.json`,
          "--asset-pack",
          `tmp/${projectId}/asset-pack.json`,
          "--captions-out",
          `tmp/${projectId}/captions.json`,
          "--asr-out",
          `tmp/${projectId}/asr.json`,
        ],
        {
          cwd: projectRoot,
          encoding: "utf8",
          env: {
            ...process.env,
            VIDEO_FACTORY_SKIP_ASR: "1",
          },
        },
      );

      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(existsSync(path.join(projectDir, "asr.json"))).toBe(true);
      const captions = JSON.parse(readFileSync(path.join(projectDir, "captions.json"), "utf8"));
      expect(captions.map((caption) => caption.text)).toEqual(["第一拍。", "第二拍。"]);
      expect(captions[0]).toMatchObject({ startMs: 0, timestampMs: 0 });
      expect(captions[0].endMs).toBeGreaterThanOrEqual(950);
      expect(captions[0].endMs).toBeLessThanOrEqual(1050);
      expect(captions[1].startMs).toBe(captions[0].endMs);
      expect(captions[1].endMs).toBeGreaterThanOrEqual(1900);
      expect(captions[1].confidence).toBeNull();
    } finally {
      rmSync(projectDir, { recursive: true, force: true });
      rmSync(publicProjectDir, { recursive: true, force: true });
    }
  });
});
