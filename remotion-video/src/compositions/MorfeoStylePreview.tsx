import React from 'react';
import {AbsoluteFill} from 'remotion';
import {DotGridParallax, GodRays} from '../components/visual-atoms';
import {MorfeoHeroBlock} from '../components/morfeo';
import {MORFEO_LIME} from '../components/morfeo/morfeoTokens';

const MorfeoStylePreview: React.FC = () => {
  return (
    <AbsoluteFill>
      <GodRays color={MORFEO_LIME} intensity={0.62} rays={7} />
      <DotGridParallax dotColor={MORFEO_LIME} density={0.44} depth={3} />
      <MorfeoHeroBlock
        tag="OpenClaw / Remotion / 风格升级"
        tagEmoji="🟢"
        heroEmoji="🎙️"
        title="Apple Emoji 有了，Morfeo 的风格骨架也补上了。"
        highlightedWord="Morfeo"
        lines={[
          '先用亮绿色标签把品牌语气立住。',
          '再用斜体标题和行内 Emoji 把画面气质拉开。',
          '最后用固定入场顺序，让每条开场都不再像随机拼装。',
        ]}
      />
    </AbsoluteFill>
  );
};

export default MorfeoStylePreview;
