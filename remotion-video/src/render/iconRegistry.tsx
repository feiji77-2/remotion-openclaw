import React from 'react';
import type { RenderIconId } from './types';

type IconProps = {
  size?: number;
  color?: string;
  secondaryColor?: string;
};

const baseStroke = {
  fill: 'none',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

// ── Legacy brand components (multi-color / complex paths) ──

const GitHubIcon: React.FC<IconProps> = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577V20.58c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.49 11.49 0 0 1 12 5.8c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.562 21.797 24 17.3 24 12 24 5.373 18.627 0 12 0Z" />
  </svg>
);

const TelegramIcon: React.FC<IconProps> = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M21 3 3 10.5l5.8 2.2L18 6l-6.6 7.1V20l3.2-3.5L19 20l2-17Z" fill={color} />
  </svg>
);

const DiscordIcon: React.FC<IconProps> = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M6 6.8C8.4 5 10.8 4.5 12 4.5c1.2 0 3.6.5 6 2.3 1 2.1 1.8 4.8 1.8 8.4-1.8 1.4-3.6 2.2-5.4 2.6l-1-1.6c.7-.2 1.5-.5 2.2-.9-.5.4-1.4.8-3.6.8s-3.1-.4-3.6-.8c.7.4 1.5.7 2.2.9l-1 1.6c-1.8-.4-3.6-1.2-5.4-2.6 0-3.6.8-6.3 1.8-8.4Z" fill={color} />
    <circle cx="9.3" cy="12.2" r="1.2" fill="#0a0a1a" />
    <circle cx="14.7" cy="12.2" r="1.2" fill="#0a0a1a" />
  </svg>
);

const SlackIcon: React.FC<IconProps> = ({ size = 20, color = '#fff', secondaryColor = '#ffd166' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <rect x="3" y="9.5" width="6" height="3" rx="1.5" fill={color} />
    <rect x="7" y="3" width="3" height="6" rx="1.5" fill={secondaryColor} />
    <rect x="14.5" y="3" width="3" height="6" rx="1.5" fill={color} />
    <rect x="15" y="14.5" width="6" height="3" rx="1.5" fill={secondaryColor} />
    <rect x="14" y="15" width="3" height="6" rx="1.5" fill={color} />
    <rect x="3" y="14" width="6" height="3" rx="1.5" fill={secondaryColor} />
  </svg>
);

const WhatsAppIcon: React.FC<IconProps> = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 3.5a8.4 8.4 0 0 0-7.2 12.8L4 21l4.9-1.3A8.5 8.5 0 1 0 12 3.5Z" fill={color} opacity={0.18} />
    <path d="M12 4.8a7.2 7.2 0 0 0-6.2 10.9l.3.4-.6 2.8 2.9-.7.4.2A7.2 7.2 0 1 0 12 4.8Z" stroke={color} {...baseStroke} />
    <path d="M9.3 8.8c.2-.4.4-.4.7-.4h.6c.2 0 .4.1.5.4l.7 1.7c.1.2 0 .4-.1.5l-.5.7c.5.9 1.2 1.6 2.1 2.1l.7-.5c.2-.1.4-.2.5-.1l1.7.7c.3.1.4.3.4.5v.6c0 .3 0 .5-.4.7-.6.3-1.3.4-1.9.2-1.3-.3-2.6-1.1-3.8-2.4-1.2-1.2-2-2.5-2.4-3.8-.2-.6-.1-1.3.2-1.9Z" fill={color} />
  </svg>
);

const RedditIcon: React.FC<IconProps> = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="13" r="6" stroke={color} {...baseStroke} />
    <circle cx="9.3" cy="12.5" r="1" fill={color} />
    <circle cx="14.7" cy="12.5" r="1" fill={color} />
    <path d="M9.2 15c1 .8 2 .9 2.8.9.9 0 1.9-.1 2.8-.9" stroke={color} {...baseStroke} />
    <circle cx="18.2" cy="7.2" r="1.7" stroke={color} {...baseStroke} />
    <path d="M12.8 8.2 14 5.4l3 .6" stroke={color} {...baseStroke} />
  </svg>
);

const OllamaIcon: React.FC<IconProps> = ({ size = 20, color = '#fff', secondaryColor = '#00d4ff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M6 18V9.5c0-2.8 2.7-5 6-5s6 2.2 6 5V18" stroke={color} {...baseStroke} />
    <path d="M9 11.2c1.2-.8 2-.9 3-.9s1.8.1 3 .9" stroke={secondaryColor} {...baseStroke} />
    <path d="M8.5 18h7M10 21h4" stroke={color} {...baseStroke} />
  </svg>
);

// ── Compact brand icon definitions ──
// Single SVG path string per brand. Renders via CompactIcon.
const BRAND_PATHS: Record<string, string> = {
  x: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  youtube: 'M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z',
  linkedin: 'M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19a.66.66 0 000 .14V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z',
  figma: 'M12 12a4 4 0 114 4 4 4 0 01-4-4zM4 20a4 4 0 014-4h4v4a4 4 0 01-8 0zM12 4v8h4a4 4 0 000-8h-4zM4 8a4 4 0 014-4h4v4H8a4 4 0 01-4-4zM4 16a4 4 0 014-4h4v4H8a4 4 0 01-4 0z',
  docker: 'M13 10h3v3h-3zm-5 0h3v3H8zm5-4h3v3h-3zm-5 0h3v3H8zm10 4h3v3h-3zM8 18c-5 0-7-3-7-7s2-7 7-7c1.5 2.5 3.5 6 5 7 1.5-1 3.5-4.5 5-7 5 0 7 3 7 7s-2 7-7 7H8z',
  notion: 'M4 5a2 2 0 012-2h3a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm7 0a2 2 0 012-2h3a2 2 0 012 2v14a2 2 0 01-2 2h-3a2 2 0 01-2-2V5zM18 5a2 2 0 012-2h0a2 2 0 012 2v14a2 2 0 01-2 2h0a2 2 0 01-2-2V5z',
  google: 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z',
  apple: 'M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z',
  amazon: 'M13.5 3.5A8.5 8.5 0 005 12a8.5 8.5 0 0015 5.5l-1.5-1.5A6.5 6.5 0 117 12a6.5 6.5 0 0111.5-4l-2 2h5.5V4.5l-2 2A8.5 8.5 0 0013.5 3.5z',
  aws: 'M7.5 14.5l4-2.5 4 2.5-4 2.5-4-2.5zm-3 5l4-2.5 4 2.5-4 2.5-4-2.5zm14-10l-4-2.5-4 2.5 4 2.5 4-2.5zm-3 5l4-2.5 4 2.5-4 2.5-4-2.5z',
  vercel: 'M12 2L22 22H2L12 2z',
  linear: 'M3 17.5L13.5 7 21 14.5 17.5 18 13.5 14 7 20.5 3 17.5z',
  typescript: 'M2 3h20v18H2V3zm11 10.5h3.5v-2H16v-1.5h-3.5v1.5h1.5v2H13v2h5v-4h-4v1.5zm-4.5 0H11v-6H8.5v6z',
  react: 'M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2zm0 3a12 12 0 00-3.5 7A12 12 0 0012 19a12 12 0 003.5-7A12 12 0 0012 5z',
  nodejs: 'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5l7 3.5v5l-7 3.5-7-3.5V8l7-3.5zM8 10v4l4 2 4-2v-4l-4-2-4 2z',
  python: 'M12 2C6.5 2 6 5.5 6 8h4c0-1.5.5-2 2-2 1.5 0 2 .5 2 2s-.5 2-2 2H8c-2.5 0-4 1.5-4 4s1.5 4 4 4h2v-2c0-2.5 1.5-4 4-4s4 1.5 4 4-1.5 4-4 4h-2c-2.5 0-6 1.5-6 6s3.5 6 6 6c5.5 0 6-3.5 6-6h-4c0 1.5-.5 2-2 2s-2-.5-2-2 .5-2 2-2h4c2.5 0 4-1.5 4-4s-1.5-4-4-4h-2c-2.5 0-4-1.5-4-4s1.5-4 4-4z',
  golang: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 6h6l-1 2h-4l-.5 1h4l-1 2h-4l-1 2h-2l2-4-1-2 1-2 1-1z',
  rust: 'M12 2L2 7v10l10 5 10-5V7L12 2zm0 3l7 3.5v5L12 17l-7-3.5v-5L12 5zm0 2a5 5 0 100 10 5 5 0 000-10z',
  javascript: 'M2 3h20v18H2V3zm13 15.5c1.5 0 2.5-.5 3.5-1.5l-2-1.5c-.5.5-1 .8-1.5.8s-1-.3-1-1v-5h3v-2h-5v7c0 2 1 3.2 3 3.2zm-7 .3c1.2 0 2.2-.4 3-1.2l-1.8-1.5c-.3.3-.7.5-1.2.5s-1-.2-1.2-.6L6 17.5c.6 1 1.5 1.3 2.8 1.3z',
  vue: 'M12 2L2 21h4l6-11 6 11h4L12 2z',
  svelte: 'M12 2L3 10v4l9 8 9-8v-4L12 2zm0 3.5L7 10l2.5 2.5L12 10l2.5 2.5L17 10l-5-4.5z',
  nextjs: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 3c3.9 0 7 3.1 7 7 0 1.8-.7 3.5-1.8 4.7l-7-7.7V5zm-1 9l8 6.2c-1.8 1.5-4.2 2.5-7 2.5-3.9 0-7-3.1-7-7 0-2.1.9-4 2.4-5.3L11 14z',
  tailwind: 'M12 2C8 2 5 5 4 9c2-1 4-1 5 0 1 1 2 2 4 2 4 0 7-3 8-7-2 1-4 1-5 0-1-1-2-2-4-2zM8 13c-4 0-7 3-8 7 2-1 4-1 5 0 1 1 2 2 4 2 4 0 7-3 8-7-2 1-4 1-5 0-1-1-2-2-4-2z',
  supabase: 'M12 2L3 14h9l-2 8 9-12h-9l2-8z',
  stripe: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 8h-8v2h6c.6 0 1 .4 1 1s-.4 1-1 1h-1.5l-3 3-1.5-1.5 2-2H9c-1.7 0-3-1.3-3-3s1.3-3 3-3h8v2z',
  netlify: 'M12 2L2 12l10 10 10-10L12 2zm4 10l-4 4-4-4 4-4 4 4z',
  cloudflare: 'M7 14c-1.5 0-3-1-3-3s1.5-3 3-3c.5 0 1 .2 1.5.3C9 6 11 4.5 13 4.5c2.5 0 4.5 2 4.5 4.5v.5c.8-.3 1.7-.5 2.5-.5 2 0 4 1.5 4 4s-2 4-4 4H7z',
  mongodb: 'M12 2C9 7 7 12 7 16c0 3 2 5 5 5s5-2 5-5c0-4-2-9-5-14zm0 17c-1.5 0-3-1-3-3 0-2.5 1.5-6 3-8.5 1.5 2.5 3 6 3 8.5 0 2-1.5 3-3 3z',
  postgres: 'M12 2C7 2 5 5 5 9c0 3 1 5 3 7l1 5h6l1-5c2-2 3-4 3-7 0-4-2-7-7-7zm0 2c2.5 0 4 1.5 4 4.5S14.5 13 12 13s-4-1.5-4-4.5S9.5 4 12 4z',
  redis: 'M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.5L18 9v4l-6 3-6-3V9l6-4.5zM6 12l6 3 6-3v2l-6 3-6-3v-2z',
  graphql: 'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5l7 3.5v5l-7 3.5-7-3.5V8l7-3.5zM6.5 10v4L12 17l5.5-3v-4L12 7l-5.5 3z',
  kubernetes: 'M12 2L3 7v10l9 5 9-5V7l-9-5zm0 3l6 3.5v5L12 17l-6-3.5v-5L12 5zm0 2a5 5 0 100 10 5 5 0 000-10z',
  terraform: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9 0h7v7h-7v-7z',
  gitlab: 'M12 2l2.5 6.5L22 9l-5.5 4.5L18 21l-6-5.5L6 21l1.5-7.5L2 9l7.5-.5L12 2z',
  jira: 'M12 2C9 5 7 8 7 12s2 7 5 10c3-3 5-6 5-10s-2-7-5-10zm0 4c1.5 2 2 4 2 6s-.5 4-2 6c-1.5-2-2-4-2-6s.5-4 2-6z',
  huggingface: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-3 7h6v2H9V9zm0 4h6v2H9v-2z',
  pytorch: 'M12 2C7 2 3 6 3 11s4 9 9 9 9-4 9-9-4-9-9-9zm0 3l5 5h-3v5l-5-5h3V5z',
  tensorflow: 'M12 2L2 7v10l10 5 10-5V7L12 2zm0 3l7 3.5v5L12 17V5zM5 9.5l5 2.5v5l-5-2.5v-5zm14 0v5l-5 2.5v-5l5-2.5z',
  astro: 'M12 2L2 22h4l6-16 6 16h4L12 2z',
  bun: 'M12 2C9 2 7 5 7 8c0 3 1 5 2 7h6c1-2 2-4 2-7 0-3-2-6-5-6zm-1 2c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1zm2 0c.5 0 1 .5 1 1s-.5 1-1 1-1-.5-1-1 .5-1 1-1zM9 16h6l-1 2H8l1-2z',
  deno: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c3.87 0 7 3.13 7 7s-3.13 7-7 7-7-3.13-7-7 3.13-7 7-7z',
  playwright: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 3c3.9 0 7 3.1 7 7s-3.1 7-7 7-7-3.1-7-7 3.1-7 7-7z',
  meta: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-1 7l3 3-3 3 1.5 1.5L16 12l-3.5-3.5L11 9z',
};

// ── Legacy component registry (complex brands) ──
const LEGACY_ICONS: Record<string, React.FC<IconProps>> = {
  github: GitHubIcon,
  telegram: TelegramIcon,
  discord: DiscordIcon,
  slack: SlackIcon,
  whatsapp: WhatsAppIcon,
  reddit: RedditIcon,
  ollama: OllamaIcon,
};

// ── Compact icon renderer ──
const CompactIcon: React.FC<IconProps & { path: string }> = ({ size = 20, color = '#fff', path }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d={path} fill={color} />
  </svg>
);

// ── All icon labels ──
const ICON_LABELS: Record<string, string> = {
  amazon: 'Amazon',
  apple: 'Apple',
  astro: 'Astro',
  aws: 'AWS',
  bun: 'Bun',
  cloudflare: 'Cloudflare',
  deno: 'Deno',
  discord: 'Discord',
  docker: 'Docker',
  figma: 'Figma',
  github: 'GitHub',
  gitlab: 'GitLab',
  golang: 'Go',
  google: 'Google',
  graphql: 'GraphQL',
  huggingface: 'Hugging Face',
  javascript: 'JavaScript',
  jira: 'Jira',
  kubernetes: 'Kubernetes',
  linear: 'Linear',
  linkedin: 'LinkedIn',
  meta: 'Meta',
  mongodb: 'MongoDB',
  netlify: 'Netlify',
  nextjs: 'Next.js',
  nodejs: 'Node.js',
  notion: 'Notion',
  ollama: 'Ollama',
  playwright: 'Playwright',
  postgres: 'PostgreSQL',
  python: 'Python',
  pytorch: 'PyTorch',
  react: 'React',
  redis: 'Redis',
  reddit: 'Reddit',
  rust: 'Rust',
  slack: 'Slack',
  stripe: 'Stripe',
  supabase: 'Supabase',
  svelte: 'Svelte',
  tailwind: 'Tailwind',
  telegram: 'Telegram',
  tensorflow: 'TensorFlow',
  terraform: 'Terraform',
  typescript: 'TypeScript',
  vercel: 'Vercel',
  vue: 'Vue',
  whatsapp: 'WhatsApp',
  x: 'X',
  youtube: 'YouTube',
};

/** Exhaustive list of every RenderIconId for runtime iteration. */
export const ALL_RENDER_ICON_IDS = [
  'amazon', 'apple', 'astro', 'aws',
  'bun', 'cloudflare', 'deno', 'discord', 'docker',
  'figma', 'github', 'gitlab', 'golang', 'google', 'graphql',
  'huggingface', 'javascript', 'jira',
  'kubernetes', 'linear', 'linkedin',
  'meta', 'mongodb',
  'netlify', 'nextjs', 'nodejs', 'notion',
  'ollama',
  'playwright', 'postgres', 'python', 'pytorch',
  'react', 'redis', 'reddit', 'rust',
  'slack', 'stripe', 'supabase', 'svelte',
  'tailwind', 'telegram', 'tensorflow', 'terraform', 'typescript',
  'vercel', 'vue',
  'whatsapp',
  'x',
  'youtube',
] as const;

/** Set version of ALL_RENDER_ICON_IDS for O(1) lookups. */
export const RENDER_ICON_IDS_SET: ReadonlySet<string> = new Set(ALL_RENDER_ICON_IDS);

/** Brand icon color mappings for orbit badge backgrounds. */
export const BRAND_ICON_COLORS: Record<string, string> = {
  // Social / Communication
  github: '#f8fafc', telegram: '#60a5fa', discord: '#a78bfa',
  slack: '#f8fafc', whatsapp: '#34d399', reddit: '#fb7185',
  linkedin: '#0a66c2', x: '#f8fafc', youtube: '#ff4444',
  meta: '#1877F2',
  // Cloud / Infrastructure
  aws: '#ff9900', cloudflare: '#f38020', netlify: '#00c7b7',
  vercel: '#f8fafc', docker: '#2496ed', kubernetes: '#326ce5',
  terraform: '#844fba', mongodb: '#47a248', postgres: '#336791',
  redis: '#ff4438', supabase: '#3ecf8e',
  // Dev Tools
  figma: '#f24e1e', gitlab: '#fc6d26', jira: '#0052cc',
  linear: '#5e6ad2', notion: '#f8fafc', stripe: '#635bff',
  typescript: '#3178c6', javascript: '#f7df1e', react: '#61dafb',
  vue: '#4fc08d', svelte: '#ff3e00', nextjs: '#f8fafc',
  nodejs: '#339933', python: '#3776ab', golang: '#00add8',
  rust: '#f74c00', bun: '#fbf0df', deno: '#f8fafc',
  playwright: '#2e9fff', astro: '#ff5d01', tailwind: '#38bdf8',
  // Data / AI
  graphql: '#e535ab', tensorflow: '#ff6f00', pytorch: '#ee4c2c',
  huggingface: '#ffd21e', ollama: '#67e8f9',
  // Commerce / Other
  amazon: '#ff9900', apple: '#f8fafc', google: '#4285f4',
};

// ── RenderIcon component ──
export const RenderIcon: React.FC<{
  id: RenderIconId;
  size?: number;
  color?: string;
  secondaryColor?: string;
}> = ({ id, size = 20, color = '#fff', secondaryColor = '#00d4ff' }) => {
  const Legacy = LEGACY_ICONS[id];
  if (Legacy) return <Legacy size={size} color={color} secondaryColor={secondaryColor} />;
  const path = BRAND_PATHS[id];
  if (path) return <CompactIcon size={size} color={color} path={path} />;
  return null;
};

export const getIconLabel = (id: RenderIconId) => ICON_LABELS[id];

// Backward-compatible named exports for older compositions.
export { GitHubIcon as IconReddit };
export { GitHubIcon as IconBrain };
