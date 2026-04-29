import React from 'react';
import {AbsoluteFill} from 'remotion';
import {AppleEmoji, InlineEmoji} from '../components/AppleEmoji';
import {BrandIcon} from '../components/BrandIcon';

const bgStyle: React.CSSProperties = {
  background: 'radial-gradient(circle at top left, rgba(0,212,255,0.22), transparent 34%), radial-gradient(circle at bottom right, rgba(99,102,241,0.2), transparent 32%), linear-gradient(160deg, #07111f 0%, #0b1630 48%, #08101c 100%)',
  color: '#f5f7ff',
  fontFamily: '"SF Pro Display", "PingFang SC", "Helvetica Neue", sans-serif',
};

const cardStyle: React.CSSProperties = {
  flex: 1,
  borderRadius: 34,
  border: '1px solid rgba(148, 163, 184, 0.2)',
  background: 'linear-gradient(180deg, rgba(15,23,42,0.88), rgba(15,23,42,0.72))',
  boxShadow: '0 28px 80px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.08)',
  padding: '40px 42px',
  display: 'flex',
  flexDirection: 'column',
  gap: 24,
  backdropFilter: 'blur(18px)',
};

const chipStyle = (accent: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  borderRadius: 999,
  background: `${accent}20`,
  border: `1px solid ${accent}55`,
  fontSize: 18,
  lineHeight: 1,
});

const badgeStyle = (ok: boolean): React.CSSProperties => ({
  alignSelf: 'flex-start',
  padding: '10px 14px',
  borderRadius: 999,
  background: ok ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.14)',
  border: `1px solid ${ok ? 'rgba(16,185,129,0.45)' : 'rgba(245,158,11,0.45)'}`,
  color: ok ? '#9ef0c8' : '#ffd48b',
  fontSize: 18,
  fontWeight: 700,
});

const EmojiRow: React.FC<{emoji: string; label: string}> = ({emoji, label}) => {
  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 24,
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(180deg, rgba(59,130,246,0.16), rgba(99,102,241,0.08))',
            border: '1px solid rgba(96,165,250,0.32)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <AppleEmoji emoji={emoji} size={46} />
        </div>
        <div style={{fontSize: 28, fontWeight: 650}}>{label}</div>
      </div>
      <div style={{fontSize: 16, color: 'rgba(226,232,240,0.68)'}}>CDN Apple emoji，可稳定出片</div>
    </div>
  );
};

const IconRow: React.FC<{id: 'telegram' | 'whatsapp' | 'github'; label: string; accent: string}> = ({
  id,
  label,
  accent,
}) => {
  return (
    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 24,
            display: 'grid',
            placeItems: 'center',
            background: 'linear-gradient(180deg, rgba(15,23,42,0.94), rgba(15,23,42,0.68))',
            border: `1px solid ${accent}55`,
            boxShadow: '0 10px 28px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <BrandIcon brand={id} size={42} color={accent} secondaryColor="#ffffff" />
        </div>
        <div style={{fontSize: 28, fontWeight: 650}}>{label}</div>
      </div>
      <div style={{fontSize: 16, color: 'rgba(226,232,240,0.68)'}}>内联 SVG，可稳定渲染</div>
    </div>
  );
};

const Divider: React.FC = () => (
  <div style={{width: '100%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(148,163,184,0.3), transparent)'}} />
);

const IconEmojiCapabilityPreview: React.FC = () => {
  return (
    <AbsoluteFill style={bgStyle}>
      <AbsoluteFill style={{padding: '54px 60px 48px'}}>
        <div style={{display: 'flex', flexDirection: 'column', gap: 32, height: '100%'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24}}>
            <div style={{display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 980}}>
              <div style={{...chipStyle('#22d3ee'), letterSpacing: 2.4, textTransform: 'uppercase', fontWeight: 700}}>
                remotion capability check
              </div>
              <div style={{fontSize: 64, lineHeight: 1.04, fontWeight: 800}}>
                你现在的项目：
                <span style={{color: '#67e8f9'}}>品牌图标有</span>，
                <span style={{color: '#86efac'}}>Apple 风格 Emoji 封装也有了</span>
              </div>
              <div style={{fontSize: 24, lineHeight: 1.55, color: 'rgba(226,232,240,0.78)'}}>
                左侧已经改成 CDN Apple emoji 图片组件；右侧是统一后的 BrandIcon 入口。
                后面正文里如果要做行内表情，可以直接把
                <span style={{display: 'inline-flex', alignItems: 'center', gap: 8, marginInline: 8}}>
                  <InlineEmoji emoji="🎙️" size={28} />
                  <span style={{fontWeight: 700, color: '#f8fafc'}}>InlineEmoji</span>
                </span>
                塞进文本旁边。
              </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-end'}}>
              <div style={{...badgeStyle(true)}}>BrandIcon 等价能力：有</div>
              <div style={{...badgeStyle(true)}}>AppleEmoji / InlineEmoji：已补齐</div>
            </div>
          </div>

          <div style={{display: 'flex', gap: 28, flex: 1}}>
            <div style={cardStyle}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16}}>
                <div style={{fontSize: 34, fontWeight: 760}}>当前 Emoji 渲染</div>
                <div style={chipStyle('#10b981')}>已补齐</div>
              </div>
              <div style={{fontSize: 20, lineHeight: 1.5, color: 'rgba(226,232,240,0.72)'}}>
                现在这里已经改成通过 CDN 拉 Apple 风格 emoji 图像，不再依赖系统彩色 emoji。
                后面把旧组件里的原生字符替换掉，就能让整个项目语义统一。
              </div>
              <Divider />
              <EmojiRow emoji="🤖" label="机器人 / AI" />
              <EmojiRow emoji="🎙️" label="麦克风 / 口播" />
              <EmojiRow emoji="⚡" label="速度 / 爆点" />
              <EmojiRow emoji="📈" label="增长 / 数据" />
            </div>

            <div style={cardStyle}>
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16}}>
                <div style={{fontSize: 34, fontWeight: 760}}>当前品牌图标渲染</div>
                <div style={chipStyle('#10b981')}>可用区</div>
              </div>
              <div style={{fontSize: 20, lineHeight: 1.5, color: 'rgba(226,232,240,0.72)'}}>
                这块你已经走在正确方向上了。不是图标库字体，而是内联 SVG，所以在 Remotion 里更稳定，也更适合做品牌露出。
              </div>
              <Divider />
              <IconRow id="telegram" label="Telegram" accent="#60a5fa" />
              <IconRow id="whatsapp" label="WhatsApp" accent="#34d399" />
              <IconRow id="github" label="GitHub" accent="#e2e8f0" />
              <div style={{marginTop: 'auto', display: 'flex', gap: 12, flexWrap: 'wrap'}}>
                <div style={chipStyle('#60a5fa')}>新入口：BrandIcon</div>
                <div style={chipStyle('#34d399')}>底层继续复用 RenderIcon registry</div>
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export default IconEmojiCapabilityPreview;
