import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  registerRoot,
} from "remotion";
import { z } from "zod";

const ShotSchema = z.object({
  shotId: z.string(),
  title: z.string(),
  subtitle: z.string(),
  level: z.string(),
  duration: z.number(),
  visualType: z.string(),
  bgColor: z.string(),
  accentColor: z.string(),
});

export type ShotProps = z.infer<typeof ShotSchema>;

// ============ SHOT COMPONENTS ============

const Shot01Core: React.FC<ShotProps> = ({ title }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Scattered chaos papers */}
      {[
        { x: 15, y: 20, r: -15, w: 70, h: 90, o: 0.15 },
        { x: 75, y: 15, r: 20, w: 60, h: 80, o: 0.12 },
        { x: 10, y: 65, r: 25, w: 80, h: 70, o: 0.1 },
        { x: 80, y: 60, r: -10, w: 65, h: 85, o: 0.13 },
        { x: 45, y: 75, r: 5, w: 90, h: 60, o: 0.08 },
      ].map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.w,
            height: p.h,
            background: `rgba(255, 200, 100, ${p.o})`,
            transform: `rotate(${p.r}deg)`,
            borderRadius: 4,
            border: "1px solid rgba(255, 200, 100, 0.2)",
          }}
        />
      ))}

      {/* Stress indicator */}
      <div style={{ fontSize: 100, opacity: 0.1, position: "absolute", bottom: 60 }}>
        😫
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", zIndex: 10 }}>
        <div
          style={{
            fontSize: 56,
            fontWeight: 900,
            color: "white",
            letterSpacing: "-0.03em",
            textShadow: "0 0 60px rgba(139, 92, 246, 0.6)",
            marginBottom: 16,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 20, color: "rgba(255,255,255,0.5)" }}>
          抛出问题，引出反差
        </div>
      </div>

      {/* Badge */}
      <div
        style={{
          position: "absolute",
          top: 32,
          right: 40,
          background: "rgba(139, 92, 246, 0.25)",
          border: "1px solid rgba(139, 92, 246, 0.5)",
          borderRadius: 8,
          padding: "10px 24px",
          color: "rgba(255,255,255,0.9)",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.05em",
        }}
      >
        SHOT 01 · 开场钩子
      </div>
    </div>
  );
};

const Shot02Core: React.FC<ShotProps> = ({ title, subtitle }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, #0c0c1e 0%, #1a0a2e 50%, #0d0d20 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Glowing AI modules */}
      {[
        { x: 35, y: 30, s: 60, c: "#8b5cf6", d: 0 },
        { x: 50, y: 25, s: 50, c: "#06b6d4", d: 1 },
        { x: 65, y: 32, s: 55, c: "#f59e0b", d: 2 },
        { x: 42, y: 45, s: 45, c: "#ec4899", d: 3 },
        { x: 58, y: 48, s: 52, c: "#10b981", d: 4 },
        { x: 50, y: 38, s: 70, c: "#6366f1", d: 5 },
      ].map((m, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${m.x}%`,
            top: `${m.y}%`,
            width: m.s,
            height: m.s,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${m.c} 0%, transparent 70%)`,
            opacity: 0.4,
            transform: "translate(-50%, -50%)",
            boxShadow: `0 0 30px ${m.c}`,
          }}
        />
      ))}

      {/* Alibaba-style logo circle */}
      <div
        style={{
          position: "absolute",
          top: 25,
          right: 50,
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #ff6a00 0%, #ff0000 100%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          boxShadow: "0 0 40px rgba(255, 106, 0, 0.5)",
        }}
      >
        <span style={{ color: "white", fontSize: 36, fontWeight: 900 }}>Ali</span>
      </div>

      {/* Date badge */}
      <div
        style={{
          position: "absolute",
          top: 35,
          left: 50,
          background: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: 8,
          padding: "8px 20px",
          color: "white",
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "0.1em",
        }}
      >
        3月17日
      </div>

      {/* Title */}
      <div style={{ textAlign: "center", zIndex: 10 }}>
        <div
          style={{
            fontSize: 44,
            fontWeight: 900,
            color: "white",
            letterSpacing: "-0.02em",
            textShadow: "0 0 60px rgba(139, 92, 246, 0.8)",
            marginBottom: 16,
            maxWidth: 800,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 22, color: "rgba(255,255,255,0.6)" }}>
          {subtitle}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 32,
          right: 40,
          background: "rgba(139, 92, 246, 0.25)",
          border: "1px solid rgba(139, 92, 246, 0.5)",
          borderRadius: 8,
          padding: "10px 24px",
          color: "rgba(255,255,255,0.9)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        SHOT 02 · 核心信息①
      </div>
    </div>
  );
};

const Shot03Core: React.FC<ShotProps> = ({ title }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, #0a0a1a 0%, #1e1e3f 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Split screen divider */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: 2,
          background: "rgba(255,255,255,0.3)",
          transform: "translateX(-50%)",
        }}
      />

      {/* VS badge */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #ff6b6b, #ee5a24)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: 18,
          fontWeight: 900,
          color: "white",
          zIndex: 20,
          boxShadow: "0 0 30px rgba(255, 107, 107, 0.6)",
        }}
      >
        VS
      </div>

      {/* LEFT side - 10 people */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: "50%",
          bottom: 0,
          background: "rgba(255, 50, 50, 0.05)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 80,
        }}
      >
        <div style={{ fontSize: 72, marginBottom: 10 }}>👥👥👥👥👥</div>
        <div style={{ fontSize: 72, marginBottom: 20 }}>👥👥👥👥👥</div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: "rgba(255, 100, 100, 0.8)",
            marginBottom: 8,
          }}
        >
          10人团队
        </div>
        <div style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>
          多系统切换 · 加班常态化
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 14,
            color: "rgba(255, 100, 100, 0.6)",
            background: "rgba(255, 50, 50, 0.15)",
            padding: "6px 16px",
            borderRadius: 20,
          }}
        >
          传统方案
        </div>
      </div>

      {/* RIGHT side - 2 people + AI */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          right: 0,
          bottom: 0,
          background: "rgba(50, 255, 100, 0.03)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 80,
        }}
      >
        <div style={{ fontSize: 72, marginBottom: 20 }}>🧑🤖</div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 900,
            color: "rgba(50, 255, 150, 0.9)",
            marginBottom: 8,
          }}
        >
          2人 + AI
        </div>
        <div style={{ fontSize: 16, color: "rgba(255,255,255,0.4)" }}>
          自动化处理 · 效率提升5倍
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 40,
            fontSize: 14,
            color: "rgba(50, 255, 150, 0.6)",
            background: "rgba(50, 255, 100, 0.15)",
            padding: "6px 16px",
            borderRadius: 20,
          }}
        >
          悟空方案
        </div>
      </div>

      {/* Title at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 130,
          textAlign: "center",
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 900,
            color: "white",
            textShadow: "0 0 40px rgba(50, 255, 150, 0.6)",
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 32,
          right: 40,
          background: "rgba(50, 255, 150, 0.2)",
          border: "1px solid rgba(50, 255, 150, 0.4)",
          borderRadius: 8,
          padding: "10px 24px",
          color: "rgba(255,255,255,0.9)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        SHOT 03 · 核心信息②
      </div>
    </div>
  );
};

const Shot04Core: React.FC<ShotProps> = ({ title }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a35 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Split screen */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: 2,
          background: "rgba(255,255,255,0.2)",
          transform: "translateX(-50%)",
        }}
      />

      {/* GPS icon */}
      <div
        style={{
          position: "absolute",
          left: "25%",
          top: "40%",
          transform: "translate(-50%, -50%)",
          fontSize: 80,
          opacity: 0.3,
        }}
      >
        📍
      </div>

      {/* Auto icon */}
      <div
        style={{
          position: "absolute",
          right: "25%",
          top: "40%",
          transform: "translate(50%, -50%)",
          fontSize: 80,
          opacity: 0.3,
        }}
      >
        🚗🤖
      </div>

      {/* LEFT - Traditional */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          right: "50%",
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 100,
        }}
      >
        <div
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.5)",
            marginBottom: 8,
          }}
        >
          传统飞书
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "rgba(255, 100, 100, 0.8)",
          }}
        >
          GPS导航
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginTop: 20 }}>
          需要人工操作
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 50,
            fontSize: 14,
            color: "rgba(255, 100, 100, 0.5)",
            background: "rgba(255, 50, 50, 0.1)",
            padding: "6px 16px",
            borderRadius: 20,
          }}
        >
          辅助驾驶
        </div>
      </div>

      {/* RIGHT - Autonomous */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 100,
        }}
      >
        <div
          style={{
            fontSize: 18,
            color: "rgba(255,255,255,0.5)",
            marginBottom: 8,
          }}
        >
          阿里悟空
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "rgba(50, 255, 150, 0.9)",
          }}
        >
          自动驾驶
        </div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginTop: 20 }}>
          全程AI自主决策
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 50,
            fontSize: 14,
            color: "rgba(50, 255, 150, 0.5)",
            background: "rgba(50, 255, 100, 0.1)",
            padding: "6px 16px",
            borderRadius: 20,
          }}
        >
          完全自动驾驶
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 130,
          textAlign: "center",
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 900,
            color: "white",
            textShadow: "0 0 40px rgba(50, 255, 150, 0.5)",
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 32,
          right: 40,
          background: "rgba(50, 200, 255, 0.2)",
          border: "1px solid rgba(50, 200, 255, 0.4)",
          borderRadius: 8,
          padding: "10px 24px",
          color: "rgba(255,255,255,0.9)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        SHOT 04 · 核心信息③
      </div>
    </div>
  );
};

const Shot05Core: React.FC<ShotProps> = ({ title }) => {
  const scenes = [
    { icon: "🛒", name: "电商团队", stat: "5家店", sub: "3人+AI搞定" },
    { icon: "👔", name: "HR招聘", stat: "-20h/周", sub: "AI筛选简历" },
    { icon: "📊", name: "市场调研", stat: "1天→1小时", sub: "AI自动分析" },
  ];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, #0a0a1a 0%, #0d1f2d 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Title */}
      <div
        style={{
          position: "absolute",
          top: 50,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 900,
            color: "white",
            textShadow: "0 0 40px rgba(139, 92, 246, 0.6)",
          }}
        >
          {title}
        </div>
      </div>

      {/* Three columns */}
      <div
        style={{
          display: "flex",
          gap: 60,
          marginTop: 40,
        }}
      >
        {scenes.map((s, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: "40px 36px",
              minWidth: 180,
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 16 }}>{s.icon}</div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "rgba(255,255,255,0.9)",
                marginBottom: 12,
              }}
            >
              {s.name}
            </div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 900,
                color: "#10b981",
                marginBottom: 8,
              }}
            >
              {s.stat}
            </div>
            <div
              style={{
                fontSize: 14,
                color: "rgba(255,255,255,0.4)",
              }}
            >
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          top: 32,
          right: 40,
          background: "rgba(16, 185, 129, 0.2)",
          border: "1px solid rgba(16, 185, 129, 0.4)",
          borderRadius: 8,
          padding: "10px 24px",
          color: "rgba(255,255,255,0.9)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        SHOT 05 · 核心信息④
      </div>
    </div>
  );
};

const Shot06Core: React.FC<ShotProps> = ({ title }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* AI Robot */}
      <div
        style={{
          fontSize: 120,
          marginBottom: 30,
          filter: "drop-shadow(0 0 40px rgba(59, 130, 246, 0.6))",
        }}
      >
        🤖
      </div>

      {/* Glowing eyes */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 50,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#3b82f6",
            boxShadow: "0 0 20px #3b82f6",
          }}
        />
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#3b82f6",
            boxShadow: "0 0 20px #3b82f6",
          }}
        />
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: 42,
          fontWeight: 900,
          color: "white",
          textAlign: "center",
          textShadow: "0 0 60px rgba(59, 130, 246, 0.8)",
          marginBottom: 30,
        }}
      >
        {title}
      </div>

      {/* CTA badge */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.2)",
          borderRadius: 30,
          padding: "12px 32px",
          color: "rgba(255,255,255,0.7)",
          fontSize: 18,
        }}
      >
        在评论区扣 1 👇
      </div>

      <div
        style={{
          position: "absolute",
          top: 32,
          right: 40,
          background: "rgba(59, 130, 246, 0.25)",
          border: "1px solid rgba(59, 130, 246, 0.5)",
          borderRadius: 8,
          padding: "10px 24px",
          color: "rgba(255,255,255,0.9)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        SHOT 06 · 收尾互动
      </div>
    </div>
  );
};

// ============ TRANSITION SHOTS ============

const TransitionShot: React.FC<{
  shotId: string;
  title: string;
  question: string;
  level: string;
  bgGradient: string;
  accentColor: string;
}> = ({ shotId, title, question, bgGradient, accentColor }) => {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: bgGradient,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Question mark */}
      <div
        style={{
          fontSize: 140,
          fontWeight: 900,
          color: `${accentColor}20`,
          position: "absolute",
          opacity: 0.5,
        }}
      >
        ?
      </div>

      {/* Content */}
      <div style={{ textAlign: "center", zIndex: 10 }}>
        <div
          style={{
            fontSize: 18,
            color: `${accentColor}cc`,
            marginBottom: 16,
            fontWeight: 600,
            letterSpacing: "0.15em",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 44,
            fontWeight: 900,
            color: "white",
            textShadow: `0 0 60px ${accentColor}80`,
          }}
        >
          {question}
        </div>
      </div>

      {/* Badge */}
      <div
        style={{
          position: "absolute",
          top: 32,
          right: 40,
          background: `${accentColor}30`,
          border: `1px solid ${accentColor}60`,
          borderRadius: 8,
          padding: "10px 24px",
          color: "rgba(255,255,255,0.9)",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {shotId} · 过渡镜头
      </div>
    </div>
  );
};

// ============ MAIN COMPOSITION ============

const ShotSequence: React.FC<{
  shots: ShotProps[];
}> = ({ shots }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  let currentFrame = 0;
  for (const shot of shots) {
    if (frame < currentFrame + shot.duration * fps) {
      switch (shot.shotId) {
        case "1":
          return <Shot01Core {...shot} />;
        case "1B":
          return (
            <TransitionShot
              shotId="SHOT 1B"
              title="等等..."
              question="钉钉被打碎了？什么意思？"
              level="过渡镜头"
              bgGradient="linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 100%)"
              accentColor="#8b5cf6"
            />
          );
        case "2":
          return <Shot02Core {...shot} />;
        case "2B":
          return (
            <TransitionShot
              shotId="SHOT 2B"
              title="等等..."
              question="什么叫沟通即执行？"
              level="过渡镜头"
              bgGradient="linear-gradient(135deg, #0c1a2e 0%, #1a2d4e 100%)"
              accentColor="#06b6d4"
            />
          );
        case "3":
          return <Shot03Core {...shot} />;
        case "3B":
          return (
            <TransitionShot
              shotId="SHOT 3B"
              title="追问..."
              question="10个人凭什么变成2个人？"
              level="过渡镜头"
              bgGradient="linear-gradient(135deg, #1a0a1e 0%, #2d1b3e 100%)"
              accentColor="#f59e0b"
            />
          );
        case "4":
          return <Shot04Core {...shot} />;
        case "4B":
          return (
            <TransitionShot
              shotId="SHOT 4B"
              title="质疑..."
              question="差距真的这么大？"
              level="过渡镜头"
              bgGradient="linear-gradient(135deg, #0a1a1e 0%, #1e3d3d 100%)"
              accentColor="#10b981"
            />
          );
        case "5":
          return <Shot05Core {...shot} />;
        case "5B":
          return (
            <TransitionShot
              shotId="SHOT 5B"
              title="追问细节..."
              question="具体怎么做到的？"
              level="过渡镜头"
              bgGradient="linear-gradient(135deg, #1a1a0a 0%, #3d3d1e 100%)"
              accentColor="#f97316"
            />
          );
        case "6":
          return <Shot06Core {...shot} />;
        default:
          return <Shot01Core {...shot} />;
      }
    }
    currentFrame += shot.duration * fps;
  }

  return (
    <div
      style={{
        backgroundColor: "#000",
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        fontSize: 24,
      }}
    >
      END
    </div>
  );
};

// ============ EXPORTS ============

const shots: ShotProps[] = [
  { shotId: "1", title: "为什么要打碎钉钉？", subtitle: "开场钩子", level: "开场钩子", duration: 5, visualType: "cinematic", bgColor: "#1a1a2e", accentColor: "#8b5cf6" },
  { shotId: "1B", title: "过渡镜头", subtitle: "等等，钉钉被打碎了？", level: "过渡镜头", duration: 3, visualType: "question", bgColor: "#2d1b4e", accentColor: "#8b5cf6" },
  { shotId: "2", title: "震撼发布：100多个AI模块×沟通即执行", subtitle: "阿里巴巴钉钉团队 · 2026年3月17日", level: "核心信息①", duration: 10, visualType: "tech", bgColor: "#1a0a2e", accentColor: "#06b6d4" },
  { shotId: "2B", title: "过渡镜头", subtitle: "什么叫沟通即执行？", level: "过渡镜头", duration: 3, visualType: "question", bgColor: "#1a2d4e", accentColor: "#06b6d4" },
  { shotId: "3", title: "不是增强，是接管：10人→2人+AI", subtitle: "效率提升5倍", level: "核心信息②", duration: 10, visualType: "split", bgColor: "#1e1e3f", accentColor: "#10b981" },
  { shotId: "3B", title: "过渡镜头", subtitle: "10个人凭什么变成2个人？", level: "过渡镜头", duration: 3, visualType: "question", bgColor: "#2d1b3e", accentColor: "#f59e0b" },
  { shotId: "4", title: "竞品对比：GPS vs 自动驾驶", subtitle: "阿里悟空 vs 飞书", level: "核心信息③", duration: 8, visualType: "split", bgColor: "#1a1a35", accentColor: "#06b6d4" },
  { shotId: "4B", title: "过渡镜头", subtitle: "差距真的这么大？", level: "过渡镜头", duration: 3, visualType: "question", bgColor: "#1e3d3d", accentColor: "#10b981" },
  { shotId: "5", title: "三大真实场景：效率翻倍实录", subtitle: "电商 · HR · 市场调研", level: "核心信息④", duration: 12, visualType: "infographic", bgColor: "#0d1f2d", accentColor: "#f97316" },
  { shotId: "5B", title: "过渡镜头", subtitle: "具体怎么做到的？", level: "过渡镜头", duration: 3, visualType: "question", bgColor: "#3d3d1e", accentColor: "#f97316" },
  { shotId: "6", title: "你觉得AI办公真的要来了吗？", subtitle: "评论区扣1", level: "收尾互动", duration: 5, visualType: "cta", bgColor: "#1a0a2e", accentColor: "#3b82f6" },
];

export const AliWukongComposition = {
 ShotSequence,
};

export { shots };

// CLI render entry point
const Entry = () => <ShotSequence shots={shots} />;
registerRoot(Entry);
