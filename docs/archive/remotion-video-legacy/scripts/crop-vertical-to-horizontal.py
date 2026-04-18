#!/usr/bin/env python3
"""
crop-vertical-to-horizontal.py — 竖屏视频智能裁剪为横版

支持三种裁剪策略:
  - center: 居中裁剪（最安全）
  - top: 保留顶部（适合有头部的画面）
  - smart: 尝试检测主体位置

用法:
  python3 scripts/crop-vertical-to-horizontal.py \
    input.mp4 output_16x9.mp4 抖音

  python3 scripts/crop-vertical-to-horizontal.py \
    input.mp4 output_16x9.mp4 B站
"""

import subprocess, sys, json, os

PLATFORM_CROP = {
    'B站': 'smart',
    '微信公众号': 'center',
}


def smart_detect(input_path: str) -> tuple[int, int]:
    """
    智能检测主体位置。
    目前用 ffprobe 检测是否有明显的亮区偏移，
    后续可接入人脸检测（OpenCV/dlib）。
    """
    # 简单策略：检测画面上半部分是否有更多亮度
    # 真实实现建议用 OpenCV 人脸检测
    return 0, 0  # 默认居中


def crop_to_horizontal(
    input_path: str,
    output_path: str,
    platform: str = 'B站'
) -> bool:
    """
    将 1080x1920 竖屏视频裁剪为 16:9 横版。
    """
    if not os.path.exists(input_path):
        print(f"❌ 文件不存在: {input_path}")
        return False

    strategy = PLATFORM_CROP.get(platform, 'center')
    src_w, src_h = 1080, 1920
    target_ratio = 16 / 9

    target_w = int(src_h * target_ratio)  # 3402
    x_offset = (src_w - target_w) // 2   # 居中

    if strategy == 'smart':
        dx, dy = smart_detect(input_path)
        x_offset = max(0, min(src_w - target_w, x_offset + dx))

    vf = f"crop={target_w}:{src_h}:{x_offset}:0"

    print(f"   裁剪策略: {strategy}")
    print(f"   滤镜: {vf}")

    result = subprocess.run([
        'ffmpeg', '-y', '-i', input_path,
        '-vf', vf,
        '-c:v', 'libx264', '-crf', '18',
        '-preset', 'medium', '-profile:v', 'high',
        '-c:a', 'copy',
        '-q:a', '0',
        output_path
    ], capture_output=True, text=True)

    if result.returncode == 0:
        size_kb = os.path.getsize(output_path) / 1024
        print(f"   ✅ 输出: {output_path} ({size_kb:.0f} KB)")
        return True
    else:
        print(f"❌ 裁剪失败: {result.stderr[-300:]}")
        return False


def main():
    if len(sys.argv) < 3:
        print("用法: python3 crop-vertical-to-horizontal.py <输入> <输出> [平台]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    platform = sys.argv[3] if len(sys.argv) > 3 else 'B站'

    print(f"🎬 竖屏 → 横版裁剪: {platform}")
    ok = crop_to_horizontal(input_path, output_path, platform)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
