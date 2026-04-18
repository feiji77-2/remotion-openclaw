import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface DialogBlockProps {
  messages: Message[];
  bgColor?: string;
  userColor?: string;
  assistantColor?: string;
}

/**
 * 对话块 — 重新美化版
 * 聊天界面框架 + 背景光晕 + 居中气泡布局
 */
export const DialogBlock: React.FC<DialogBlockProps> = ({
  messages,
  bgColor = '#0D0D1A',
  userColor = '#FF6B35',
  assistantColor = '#00BCD4',
}) => {
  const frame = useCurrentFrame();
  const glowPulse = (Math.sin(frame * 0.04) + 1) * 0.5;

  // 居中内容宽度
  const contentWidth = 800;
  const bubbleMaxWidth = 680;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: bgColor,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ===== 背景装饰 ===== */}
      {/* 左侧大光晕 */}
      <div
        style={{
          position: 'absolute',
          left: '-100px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${userColor}14 0%, transparent 70%)`,
          opacity: 0.6 + glowPulse * 0.3,
        }}
      />
      {/* 右侧大光晕 */}
      <div
        style={{
          position: 'absolute',
          right: '-100px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${assistantColor}14 0%, transparent 70%)`,
          opacity: 0.6 + glowPulse * 0.3,
        }}
      />
      {/* 顶部细线 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(to right, transparent, ${assistantColor}30, transparent)`,
        }}
      />
      {/* 底部细线 */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 1,
          background: `linear-gradient(to right, transparent, ${userColor}30, transparent)`,
        }}
      />

      {/* ===== 顶部标题栏 ===== */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 72,
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          gap: 16,
        }}
      >
        {/* 状态灯 */}
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: '#22C55E',
            boxShadow: '0 0 8px #22C55E',
          }}
        />
        <div
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13,
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          AI ASSISTANT
        </div>
        {/* 右侧装饰点 */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: `rgba(255,255,255,${0.1 + i * 0.05})`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ===== 聊天内容区 ===== */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: contentWidth,
          marginTop: 72,
          gap: 0,
        }}
      >
        {messages.map((msg, i) => {
          const delay = i * 25;
          const itemFrame = Math.max(0, frame - delay);
          const slideY = spring({
            fps: 30,
            frame: itemFrame,
            config: { damping: 160, stiffness: 100 },
          });
          const opacity = interpolate(itemFrame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
          const isUser = msg.role === 'user';
          const avatarColor = isUser ? userColor : assistantColor;
          const avatarLabel = isUser ? 'U' : 'AI';

          // 头像背景
          const avatarBg = isUser
            ? `linear-gradient(135deg, ${userColor}, ${userColor}88)`
            : `linear-gradient(135deg, ${assistantColor}, ${assistantColor}88)`;

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                width: '100%',
                marginBottom: i === messages.length - 1 ? 0 : 28,
                transform: `translateY(${(1 - slideY) * 30}px)`,
                opacity,
              }}
            >
              {/* 角色标签 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 10,
                  flexDirection: isUser ? 'row-reverse' : 'row',
                }}
              >
                {/* 头像 */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: avatarBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    fontWeight: 800,
                    color: '#FFFFFF',
                    boxShadow: `0 0 16px ${avatarColor}44`,
                    border: `2px solid ${avatarColor}40`,
                    letterSpacing: 0,
                  }}
                >
                  {avatarLabel}
                </div>
                {/* 角色名 */}
                <div
                  style={{
                    color: avatarColor,
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                  }}
                >
                  {isUser ? 'YOU' : 'ASSISTANT'}
                </div>
              </div>

              {/* 气泡 */}
              <div
                style={{
                  maxWidth: bubbleMaxWidth,
                  padding: '18px 26px',
                  background: isUser
                    ? `linear-gradient(135deg, ${userColor}28, ${userColor}14)`
                    : 'rgba(26,26,46,0.9)',
                  borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  border: `1px solid ${isUser ? `${userColor}40` : 'rgba(255,255,255,0.08)'}`,
                  fontSize: 26,
                  color: '#FFFFFF',
                  lineHeight: 1.7,
                  boxShadow: isUser
                    ? `0 4px 20px ${userColor}20`
                    : '0 4px 20px rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(10px)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== 底部输入框模拟 ===== */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          width: contentWidth,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          padding: '16px 20px',
          background: 'rgba(26,26,46,0.8)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ fontSize: 22, opacity: 0.4 }}>💬</div>
        <div
          style={{
            flex: 1,
            color: 'rgba(255,255,255,0.3)',
            fontSize: 18,
            letterSpacing: 1,
          }}
        >
          输入你想问的问题...
        </div>
        <div
          style={{
            padding: '8px 20px',
            background: `${assistantColor}30`,
            borderRadius: 10,
            color: assistantColor,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          SEND
        </div>
      </div>

      {/* ===== 背景粒子 ===== */}
      {[
        { top: '12%', left: '8%', size: 3 },
        { top: '20%', right: '10%', size: 4 },
        { top: '75%', left: '6%', size: 3 },
        { top: '80%', right: '8%', size: 4 },
        { bottom: '20%', left: '15%', size: 3 },
        { bottom: '15%', right: '15%', size: 3 },
      ].map((p, i) => {
        const pFrame = Math.max(0, frame - i * 5);
        const pOpacity = interpolate(pFrame, [0, 20], [0, 0.4], { extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: p.top,
              left: p.left,
              right: p.right,
              bottom: p.bottom,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              background: i % 2 === 0 ? userColor : assistantColor,
              opacity: pOpacity,
              boxShadow: `0 0 ${p.size * 2}px ${i % 2 === 0 ? userColor : assistantColor}`,
            }}
          />
        );
      })}
    </div>
  );
};
