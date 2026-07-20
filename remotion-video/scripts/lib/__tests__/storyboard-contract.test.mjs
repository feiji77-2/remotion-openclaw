import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertStoryboardArtifacts,
  assertStoryboardContract,
} from "../storyboard-contract.mjs";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "../../..");
const tempRoots = [];

const fakePng = (width, height, seed) => {
  const buffer = Buffer.alloc(25);
  Buffer.from("89504e470d0a1a0a", "hex").copy(buffer, 0);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  buffer[24] = seed;
  return buffer;
};

afterEach(() => {
  tempRoots
    .splice(0)
    .forEach((root) => rmSync(root, { recursive: true, force: true }));
});

describe("Remotion storyboard contract", () => {
  it("locks the reusable chain to 11 Cinematic + 9 Hero Track with isolated zones", () => {
    const result = assertStoryboardContract({ projectRoot: PROJECT_ROOT });
    expect(result.cinematicCount).toBe(11);
    expect(result.heroCount).toBe(9);
    expect(result.contract.policies.imageGeneration).toBe("remotion-code-only");
    expect(result.contract.zones.hero.bottom).toBeLessThan(
      result.contract.zones.semantic.top,
    );
    expect(result.contract.zones.semantic.bottom).toBeLessThan(
      result.contract.zones.caption.top,
    );
  });

  it("accepts 20 unique portrait Remotion stills", () => {
    const result = assertStoryboardContract({ projectRoot: PROJECT_ROOT });
    const outputDir = mkdtempSync(path.join(tmpdir(), "storyboard-contract-"));
    tempRoots.push(outputDir);
    mkdirSync(outputDir, { recursive: true });
    result.ids.forEach((id, index) =>
      writeFileSync(
        path.join(outputDir, `${String(index + 1).padStart(2, "0")}-${id}.png`),
        fakePng(1080, 1920, index),
      ),
    );
    expect(
      assertStoryboardArtifacts({
        contract: result.contract,
        ids: result.ids,
        outputDir,
      }).uniqueStillCount,
    ).toBe(20);
  });

  it("rejects a repeated still even when every file name exists", () => {
    const result = assertStoryboardContract({ projectRoot: PROJECT_ROOT });
    const outputDir = mkdtempSync(path.join(tmpdir(), "storyboard-contract-"));
    tempRoots.push(outputDir);
    result.ids.forEach((id, index) =>
      writeFileSync(
        path.join(outputDir, `${String(index + 1).padStart(2, "0")}-${id}.png`),
        fakePng(1080, 1920, index === result.ids.length - 1 ? 0 : index),
      ),
    );
    expect(() =>
      assertStoryboardArtifacts({
        contract: result.contract,
        ids: result.ids,
        outputDir,
      }),
    ).toThrow("expected 20 unique stills");
  });
});
