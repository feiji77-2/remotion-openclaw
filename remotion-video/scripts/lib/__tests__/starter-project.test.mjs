import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildAssetPack,
  buildBrief,
  buildScriptPack,
  buildStarterProject,
} from "../starter-project.mjs";

const SCRIPT = [
  "今天讲一个可执行的视频生成工作流。",
  "第一步，把口播转换成带时间戳的字幕。",
  "第二步，生成稳定的技术画面和证据。",
  "最后，检查关键帧并渲染成片。",
].join("");

describe("buildStarterProject", () => {
  it("always creates the only production family", () => {
    const project = buildStarterProject("starter", "生成链路", SCRIPT);
    expect(project.schemaVersion).toBe(1);
    expect(project.projectId).toBe("starter");
    expect(project.title).toBe("生成链路");
    expect(project.scenes.length).toBeGreaterThan(0);
    expect(
      project.scenes.every((scene) => scene.family === "skill-showcase"),
    ).toBe(true);
  });

  it("locks starter projects to the portrait production renderer", () => {
    const project = buildStarterProject(
      "starter",
      "生成链路",
      SCRIPT,
      "landscape",
    );
    expect(project.render).toMatchObject({
      fps: 30,
      width: 1080,
      height: 1920,
      orientation: "portrait",
      showProjectLabel: false,
    });
  });

  it("routes every generated scene through Hero Track", () => {
    const project = buildStarterProject("starter", "生成链路", SCRIPT);
    expect(
      project.scenes.every(
        (scene) => scene.payload.heroStyle === "hero-track-v2",
      ),
    ).toBe(true);
    expect(
      project.scenes.every(
        (scene) => scene.payload.heroTrack?.states.length > 0,
      ),
    ).toBe(true);
  });

  it("binds captions, scenes, beats and hero states continuously", () => {
    const project = buildStarterProject("starter", "生成链路", SCRIPT);
    expect(project.captions.length).toBeGreaterThan(0);
    project.scenes.forEach((scene) => {
      const range = scene.captionRange;
      const beats = scene.payload.beats;
      const states = scene.payload.heroTrack.states;
      expect(range).toBeDefined();
      expect(beats[0].startFrame).toBe(0);
      expect(beats.at(-1).endFrame).toBe(scene.durationInFrames);
      expect(states[0].startFrame).toBe(0);
      expect(states.at(-1).endFrame).toBe(scene.durationInFrames);
      expect(scene.payload.sourceText.length).toBeGreaterThan(0);
    });
  });

  it("keeps caption timing ordered and non-overlapping", () => {
    const project = buildStarterProject("starter", "生成链路", SCRIPT);
    project.captions.forEach((caption, index) => {
      expect(caption.timestampMs).toBe(caption.startMs);
      expect(caption.endMs).toBeGreaterThan(caption.startMs);
      if (index > 0)
        expect(caption.startMs).toBeGreaterThanOrEqual(
          project.captions[index - 1].endMs,
        );
    });
  });

  it("uses editorial captions for cinematic style", () => {
    const project = buildStarterProject(
      "starter",
      "生成链路",
      SCRIPT,
      "portrait",
      "amber-editorial",
    );
    expect(project.render.captionStyle).toBe("editorial");
  });

  it("attaches voiceover assets when the production pack provides audio", () => {
    const project = buildStarterProject(
      "starter",
      "生成链路",
      SCRIPT,
      "portrait",
      "cyan-tech",
      "生成,视频",
      {
        voiceSrc: "projects/starter/audio/voice.m4a",
        projectRoot: path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          "../../..",
        ),
      },
    );
    expect(project.audio).toEqual({ voiceAssetId: "voiceover" });
    expect(project.assets.voiceover).toMatchObject({
      kind: "audio",
      src: "projects/starter/audio/voice.m4a",
      required: true,
    });
  });
});

describe("production packs", () => {
  it("builds the brief contract", () => {
    const brief = buildBrief("starter", "生成链路", "portrait", "cyan-tech");
    expect(brief.productionId).toBe("starter");
    expect(brief.format).toMatchObject({ width: 1080, height: 1920, fps: 30 });
  });

  it("builds the script pack from the same narration", () => {
    const pack = buildScriptPack("starter", "生成链路", SCRIPT, "生成,视频");
    expect(pack.spokenScript).toBe(SCRIPT);
    expect(pack.keywords).toBe("生成,视频");
  });

  it("builds an empty asset pack with the project public prefix", () => {
    const pack = buildAssetPack("starter");
    expect(pack.publicPathPrefix).toBe("projects/starter");
    expect(pack.assets).toEqual([]);
  });

  it("builds packs through the same Skill Showcase renderer contract", () => {
    const projectRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../..",
    );
    const fixtureDir = mkdtempSync(path.join(tmpdir(), "project-pack-"));
    try {
      writeFileSync(
        path.join(fixtureDir, "brief.json"),
        JSON.stringify({
          productionId: "pack-smoke",
          title: "Pack Smoke",
          format: { width: 1080, height: 1920, fps: 30 },
          visualStyle: {
            presetId: "amber-editorial",
            palette: "电影感暗调",
          },
        }),
      );
      writeFileSync(
        path.join(fixtureDir, "script-pack.json"),
        JSON.stringify({
          productionId: "pack-smoke",
          title: "Pack Smoke",
          spokenScript: SCRIPT,
          keywords: "生成,视频",
        }),
      );
      writeFileSync(
        path.join(fixtureDir, "asset-pack.json"),
        JSON.stringify({ assets: [] }),
      );

      const result = spawnSync(
        process.execPath,
        [
          path.join(projectRoot, "scripts/build-project-from-production.mjs"),
          fixtureDir,
        ],
        { cwd: projectRoot, encoding: "utf8" },
      );
      expect(result.status, result.stderr).toBe(0);
      const project = JSON.parse(
        readFileSync(path.join(fixtureDir, "project.json"), "utf8"),
      );
      expect(project.render).toMatchObject({
        width: 1080,
        height: 1920,
        orientation: "portrait",
        captionStyle: "editorial",
      });
      expect(project.scenes.length).toBeGreaterThan(0);
      expect(
        project.scenes.every(
          (scene) =>
            scene.family === "skill-showcase"
            && scene.payload.heroStyle === "hero-track-v2",
        ),
      ).toBe(true);
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it("carries production-pack audio into project.json", () => {
    const projectRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../..",
    );
    const fixtureDir = mkdtempSync(path.join(tmpdir(), "project-pack-audio-"));
    try {
      writeFileSync(
        path.join(fixtureDir, "brief.json"),
        JSON.stringify({
          productionId: "pack-audio",
          title: "Pack Audio",
          visualStyle: { presetId: "cyan-tech" },
        }),
      );
      writeFileSync(
        path.join(fixtureDir, "script-pack.json"),
        JSON.stringify({
          productionId: "pack-audio",
          title: "Pack Audio",
          spokenScript: SCRIPT,
          keywords: "生成,视频",
        }),
      );
      writeFileSync(
        path.join(fixtureDir, "asset-pack.json"),
        JSON.stringify({
          assets: [
            {
              id: "voiceover",
              kind: "audio",
              src: "projects/pack-audio/audio/voice.m4a",
              required: true,
            },
          ],
        }),
      );

      const result = spawnSync(
        process.execPath,
        [
          path.join(projectRoot, "scripts/build-project-from-production.mjs"),
          fixtureDir,
        ],
        { cwd: projectRoot, encoding: "utf8" },
      );
      expect(result.status, result.stderr).toBe(0);
      const project = JSON.parse(
        readFileSync(path.join(fixtureDir, "project.json"), "utf8"),
      );
      expect(project.audio).toEqual({ voiceAssetId: "voiceover" });
      expect(project.assets.voiceover).toMatchObject({
        kind: "audio",
        src: "projects/pack-audio/audio/voice.m4a",
        required: true,
      });
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  it("rebuilds from explicitly aligned captions when provided", () => {
    const projectRoot = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../..",
    );
    const fixtureDir = mkdtempSync(path.join(tmpdir(), "project-pack-captions-"));
    const alignedCaptions = [
      {
        text: "真实音频第一拍。",
        startMs: 0,
        endMs: 720,
        timestampMs: 0,
        confidence: null,
      },
      {
        text: "真实音频第二拍。",
        startMs: 720,
        endMs: 1880,
        timestampMs: 720,
        confidence: null,
      },
    ];
    try {
      writeFileSync(
        path.join(fixtureDir, "brief.json"),
        JSON.stringify({
          productionId: "pack-captions",
          title: "Pack Captions",
          visualStyle: { presetId: "cyan-tech" },
        }),
      );
      writeFileSync(
        path.join(fixtureDir, "script-pack.json"),
        JSON.stringify({
          productionId: "pack-captions",
          title: "Pack Captions",
          spokenScript: "真实音频第一拍。真实音频第二拍。这条稿子用于检查时间码驱动画面。",
          keywords: "生成,视频",
        }),
      );
      writeFileSync(
        path.join(fixtureDir, "asset-pack.json"),
        JSON.stringify({
          assets: [
            {
              id: "voiceover",
              kind: "audio",
              src: "projects/pack-captions/audio/voice.m4a",
              required: true,
            },
          ],
        }),
      );
      writeFileSync(
        path.join(fixtureDir, "captions.json"),
        JSON.stringify(alignedCaptions),
      );

      const result = spawnSync(
        process.execPath,
        [
          path.join(projectRoot, "scripts/build-project-from-production.mjs"),
          fixtureDir,
          "--captions",
          "captions.json",
        ],
        { cwd: projectRoot, encoding: "utf8" },
      );
      expect(result.status, result.stderr).toBe(0);
      const project = JSON.parse(
        readFileSync(path.join(fixtureDir, "project.json"), "utf8"),
      );
      expect(project.captions).toEqual(alignedCaptions);
      expect(project.scenes[0].captionRange).toEqual({ startIndex: 0, endIndex: 1 });
      expect(project.scenes[0].durationInFrames).toBe(56);
      expect(project.scenes[0].payload.beats[0]).toMatchObject({
        captionStartIndex: 0,
        captionEndIndex: 0,
        startFrame: 0,
        endFrame: 22,
      });
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  });
});
