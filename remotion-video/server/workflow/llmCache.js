/**
 * llmCache.js — LLM 响应缓存
 *
 * runtime/cache/llm/ 目录下按 topic+stepId+skill 的 SHA256 哈希存储 JSON 文件。
 * TTL: 24h（通过 LLM_CACHE_TTL_HOURS 环境变量配置）。
 *
 * API:
 *   getCachedLLMResponse(topic, stepId, skill) → payload | null
 *   setCachedLLMResponse(topic, stepId, skill, payload) → void
 *   invalidateCache(topic?, stepId?) → void
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = path.join(__dirname, '../../runtime/cache/llm');
const TTL_HOURS = Number(process.env.LLM_CACHE_TTL_HOURS || '24');
const TTL_MS = TTL_HOURS * 60 * 60 * 1000;

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function computeCacheKey(topic, stepId, skill) {
  const raw = `${String(topic || '')}|${String(stepId || '')}|${String(skill || '')}`;
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

function getCachePath(topic, stepId, skill) {
  return path.join(CACHE_DIR, `${computeCacheKey(topic, stepId, skill)}.json`);
}

/**
 * 读取缓存（若存在且未过期）
 * @returns {object|null}
 */
function getCachedLLMResponse(topic, stepId, skill) {
  try {
    ensureCacheDir();
    const cachePath = getCachePath(topic, stepId, skill);
    if (!fs.existsSync(cachePath)) {
      return null;
    }
    const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    const ageMs = Date.now() - new Date(raw.createdAt).getTime();
    if (ageMs > TTL_MS) {
      fs.unlinkSync(cachePath);
      return null;
    }
    return raw.payload ?? null;
  } catch {
    return null;
  }
}

/**
 * 写入缓存
 */
function setCachedLLMResponse(topic, stepId, skill, payload) {
  try {
    ensureCacheDir();
    const cachePath = getCachePath(topic, stepId, skill);
    fs.writeFileSync(cachePath, JSON.stringify({
      topic,
      stepId,
      skill,
      payload,
      createdAt: new Date().toISOString(),
      ttlHours: TTL_HOURS,
    }, null, 2));
  } catch (err) {
    // 缓存写入失败不阻断主流程
    console.warn('[llmCache] set failed:', err.message);
  }
}

/**
 * 选择性失效缓存
 * @param {string} [topic] — 不传则清除所有
 * @param {string} [stepId] — 不传则清除该 topic 下所有
 */
function invalidateCache(topic, stepId) {
  try {
    ensureCacheDir();
    const files = fs.readdirSync(CACHE_DIR).filter(f => f.endsWith('.json'));
    for (const file of files) {
      if (topic === undefined) {
        fs.unlinkSync(path.join(CACHE_DIR, file));
        continue;
      }
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf8'));
        if (raw.topic !== topic) continue;
        if (stepId !== undefined && raw.stepId !== stepId) continue;
        fs.unlinkSync(path.join(CACHE_DIR, file));
      } catch {
        fs.unlinkSync(path.join(CACHE_DIR, file));
      }
    }
  } catch {
    // 忽略
  }
}

module.exports = {
  getCachedLLMResponse,
  setCachedLLMResponse,
  invalidateCache,
};
