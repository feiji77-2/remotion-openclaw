import React from 'react';
import {Img} from 'remotion';

const APPLE_EMOJI_CDN_VERSION = '15.1.2';
const APPLE_EMOJI_CDN_BASE = `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@${APPLE_EMOJI_CDN_VERSION}/img/apple/64`;

const emojiToCodepoints = (emoji: string) => {
  return Array.from(emoji.trim())
    .map((symbol) => symbol.codePointAt(0)?.toString(16))
    .filter((value): value is string => Boolean(value))
    .join('-');
};

export const buildAppleEmojiUrl = (emoji: string) => {
  const codepoints = emojiToCodepoints(emoji);
  if (!codepoints) {
    throw new Error('emoji is required');
  }

  return `${APPLE_EMOJI_CDN_BASE}/${codepoints}.png`;
};

export type AppleEmojiProps = {
  emoji: string;
  size?: number;
  alt?: string;
  style?: React.CSSProperties;
};

export const AppleEmoji: React.FC<AppleEmojiProps> = ({
  emoji,
  size = 24,
  alt,
  style,
}) => {
  return (
    <Img
      src={buildAppleEmojiUrl(emoji)}
      alt={alt ?? emoji}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'inline-block',
        flexShrink: 0,
        ...style,
      }}
    />
  );
};

export type InlineEmojiProps = AppleEmojiProps & {
  offsetYEm?: number;
};

export const InlineEmoji: React.FC<InlineEmojiProps> = ({
  offsetYEm = 0.12,
  style,
  ...props
}) => {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: `${-offsetYEm}em`,
        lineHeight: 1,
      }}
    >
      <AppleEmoji {...props} style={style} />
    </span>
  );
};
