export const sceneTitle = (scene: {id: string; payload: Record<string, unknown>}): string => {
  const title = typeof scene.payload.title === 'string' ? scene.payload.title.trim() : '';
  const label = typeof scene.payload.label === 'string' ? scene.payload.label.trim() : '';
  return (title || label || scene.id).slice(0, 72);
};

const stringList = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
  : [];

export const sceneKeywords = (scene: {payload: Record<string, unknown>}): string[] => {
  const labels = stringList(scene.payload.labels);
  const beats = Array.isArray(scene.payload.beats)
    ? scene.payload.beats.flatMap((beat) => {
      if (!beat || typeof beat !== 'object') return [];
      const keyword = (beat as {keyword?: unknown}).keyword;
      return typeof keyword === 'string' && keyword.trim() ? [keyword.trim()] : [];
    })
    : [];
  return [...new Set([...labels, ...beats])].slice(0, 6);
};

export const scenePurpose = (scene: {payload: Record<string, unknown>}): string => {
  const variant = typeof scene.payload.variant === 'string' ? scene.payload.variant : '';
  const map: Record<string, string> = {
    intro: '开场建立主题和观看理由。',
    capability: '展示能力结构和关键卖点。',
    comparison: '对比前后状态，突出差异。',
    workflow: '说明流程顺序和操作路径。',
    evidence: '呈现证据、素材或结果画面。',
    closing: '收束观点并引导行动。',
  };
  return map[variant] || '承载本段口播的主视觉和节拍信息。';
};
