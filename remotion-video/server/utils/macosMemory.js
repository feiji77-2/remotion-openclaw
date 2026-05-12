'use strict';

const { execSync } = require('child_process');

/**
 * 检测 macOS 系统内存压力状态
 * @returns {'normal'|'warning'|'critical'|'unknown'}
 */
function checkMemoryPressure() {
  try {
    const out = execSync(
      'memory_pressure 2>/dev/null || echo "unavailable"',
      { encoding: 'utf8', timeout: 3000 },
    );
    if (out.includes('unavailable')) return 'unknown';
    if (out.includes('normal') || out.includes('良性')) return 'normal';
    if (out.includes('warn') || out.includes('警告')) return 'warning';
    if (out.includes('critical') || out.includes('紧急')) return 'critical';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * 清理 macOS 磁盘缓存（长时间渲染后选择性调用）
 * purge 命令需要 root 权限，失败时静默忽略
 * @returns {boolean} true=成功, false=失败或无权
 */
function purgeDiskCache() {
  try {
    execSync('purge 2>/dev/null || true', { timeout: 10000 });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  checkMemoryPressure,
  purgeDiskCache,
};
