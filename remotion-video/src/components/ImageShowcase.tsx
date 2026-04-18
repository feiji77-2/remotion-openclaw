import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';

interface ImageShowcaseProps {
  images: { url?: string; path?: string; caption?: string }[];
  layout?: 'single' | 'double' | 'triple' | 'grid';
  bgColor?: string;
  accentColor?: string;
}

/**
 * 图片展示组件
 * single / double / triple / grid 四种布局
 * 图片从缩小状态放大入场
 */
export const ImageShowcase: React.FC<ImageShowcaseProps> = ({
  images,
  layout = 'single',
  bgColor = '#0D0D1A',
  accentColor = '#FF6B35',
}) => {
  const frame = useCurrentFrame();

  const layouts = {
    single: [images[0]].filter(Boolean),
    double: images.slice(0, 2),
    triple: images.slice(0, 3),
    grid: images.slice(0, 4),
  };

  const selectedImages = layouts[layout] || layouts.single;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: bgColor,
        display: 'flex',
        flexDirection: layout === 'single' ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: '80px',
      }}
    >
      {selectedImages.map((img, i) => {
        const delay = i * 8;
        const itemFrame = Math.max(0, frame - delay);
        const scale = spring({ fps: 30, frame: itemFrame, config: { damping: 120, stiffness: 80 } });
        const opacity = interpolate(itemFrame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

        const imgW = layout === 'single' ? 700 : layout === 'double' ? 420 : 320;
        const imgH = layout === 'single' ? 450 : layout === 'double' ? 320 : 240;

        return (
          <div
            key={i}
            style={{
              width: imgW,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
              transform: `scale(${scale})`,
              opacity,
            }}
          >
            {/* 图片容器 */}
            <div
              style={{
                width: imgW,
                height: imgH,
                background: '#1a1a2e',
                borderRadius: 16,
                border: `1px solid rgba(255,107,53,0.2)`,
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
              }}
            >
              {img.url ? (
                <img
                  src={img.url}
                  alt={img.caption || ''}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : img.path ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: 48,
                  }}
                >
                  🖼️
                </div>
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: 48,
                  }}
                >
                  🖼️
                </div>
              )}
            </div>

            {/* 图片说明 */}
            {img.caption && (
              <div
                style={{
                  fontSize: 20,
                  color: 'rgba(255,255,255,0.5)',
                  textAlign: 'center',
                }}
              >
                {img.caption}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
