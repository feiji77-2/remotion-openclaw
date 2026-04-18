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

const PluginIcon: React.FC<IconProps> = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M9.5 3a2 2 0 1 1 4 0v1.5H15A3 3 0 0 1 18 7.5V9h1.5a2 2 0 1 1 0 4H18v1.5A3 3 0 0 1 15 17.5h-1.5V19a2 2 0 1 1-4 0v-1.5H8A3 3 0 0 1 5 14.5V13H3.5a2 2 0 1 1 0-4H5V7.5A3 3 0 0 1 8 4.5h1.5V3Z" fill={color} opacity={0.2} />
    <path d="M9.5 4.5v4H5.5m8.5-4v4h4m-8.5 7v-4H5.5m8.5 4v-4h4" stroke={color} {...baseStroke} />
  </svg>
);

const MemoryIcon: React.FC<IconProps> = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <rect x="4" y="7" width="16" height="10" rx="2" stroke={color} {...baseStroke} />
    <path d="M8 7V5m4 2V4m4 3V5m-9 10h10" stroke={color} {...baseStroke} />
    <circle cx="12" cy="12" r="2.2" fill={color} opacity={0.25} />
  </svg>
);

const AutomationIcon: React.FC<IconProps> = ({ size = 20, color = '#fff', secondaryColor = '#00d4ff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3.5" stroke={color} {...baseStroke} />
    <path d="M12 2.8v3.1m0 12.2v3.1M2.8 12h3.1m12.2 0h3.1M5.3 5.3l2.2 2.2m9 9 2.2 2.2m0-13.4-2.2 2.2m-9 9-2.2 2.2" stroke={secondaryColor} {...baseStroke} />
  </svg>
);

const TimelineIcon: React.FC<IconProps> = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M4 12h16" stroke={color} {...baseStroke} />
    <circle cx="7" cy="12" r="2" fill={color} />
    <circle cx="12" cy="12" r="2" fill={color} opacity={0.75} />
    <circle cx="17" cy="12" r="2" fill={color} opacity={0.5} />
  </svg>
);

const CostIcon: React.FC<IconProps> = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <ellipse cx="12" cy="7" rx="6" ry="2.8" stroke={color} {...baseStroke} />
    <path d="M6 7v8c0 1.5 2.7 2.8 6 2.8s6-1.3 6-2.8V7" stroke={color} {...baseStroke} />
    <path d="M6 11.5c0 1.5 2.7 2.8 6 2.8s6-1.3 6-2.8" stroke={color} {...baseStroke} />
  </svg>
);

const SpeedIcon: React.FC<IconProps> = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M5 16a7 7 0 1 1 14 0" stroke={color} {...baseStroke} />
    <path d="M12 12l4-3" stroke={color} {...baseStroke} />
    <circle cx="12" cy="16" r="1.3" fill={color} />
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

const ShieldIcon: React.FC<IconProps> = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 3 5.5 6v5.2c0 4.3 2.7 7.6 6.5 9.8 3.8-2.2 6.5-5.5 6.5-9.8V6L12 3Z" stroke={color} {...baseStroke} />
    <path d="m9.2 12.2 1.8 1.8 3.8-4.1" stroke={color} {...baseStroke} />
  </svg>
);

const SparkIcon: React.FC<IconProps> = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" fill={color} />
  </svg>
);

const LoopIcon: React.FC<IconProps> = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M7 8a5 5 0 0 1 8.5-2.5L18 8m-1 8a5 5 0 0 1-8.5 2.5L6 16" stroke={color} {...baseStroke} />
    <path d="M18 8h-4V4M6 16h4v4" stroke={color} {...baseStroke} />
  </svg>
);

const GraphIcon: React.FC<IconProps> = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M4 18h16M6 16l4-5 3 2 5-6" stroke={color} {...baseStroke} />
    <circle cx="6" cy="16" r="1.3" fill={color} />
    <circle cx="10" cy="11" r="1.3" fill={color} />
    <circle cx="13" cy="13" r="1.3" fill={color} />
    <circle cx="18" cy="7" r="1.3" fill={color} />
  </svg>
);

const SkillsIcon: React.FC<IconProps> = ({ size = 20, color = '#fff' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 4 6 7.5v9L12 20l6-3.5v-9L12 4Z" stroke={color} {...baseStroke} />
    <path d="M12 4v7.6m0 0L18 7.5m-6 4.1L6 7.5" stroke={color} {...baseStroke} />
  </svg>
);

const ICONS: Record<RenderIconId, React.FC<IconProps>> = {
  github: GitHubIcon,
  telegram: TelegramIcon,
  discord: DiscordIcon,
  slack: SlackIcon,
  whatsapp: WhatsAppIcon,
  plugin: PluginIcon,
  memory: MemoryIcon,
  automation: AutomationIcon,
  timeline: TimelineIcon,
  cost: CostIcon,
  speed: SpeedIcon,
  reddit: RedditIcon,
  ollama: OllamaIcon,
  shield: ShieldIcon,
  spark: SparkIcon,
  loop: LoopIcon,
  graph: GraphIcon,
  skills: SkillsIcon,
};

const ICON_LABELS: Record<RenderIconId, string> = {
  github: 'GitHub',
  telegram: 'Telegram',
  discord: 'Discord',
  slack: 'Slack',
  whatsapp: 'WhatsApp',
  plugin: 'Plugins',
  memory: 'Memory',
  automation: 'Automation',
  timeline: 'Timeline',
  cost: 'Cost',
  speed: 'Speed',
  reddit: 'Reddit',
  ollama: 'Ollama',
  shield: 'Privacy',
  spark: 'Signal',
  loop: 'Loop',
  graph: 'Growth',
  skills: 'Skills',
};

export const RenderIcon: React.FC<{
  id: RenderIconId;
  size?: number;
  color?: string;
  secondaryColor?: string;
}> = ({ id, size = 20, color = '#fff', secondaryColor = '#00d4ff' }) => {
  const Icon = ICONS[id];
  return <Icon size={size} color={color} secondaryColor={secondaryColor} />;
};

export const getIconLabel = (id: RenderIconId) => ICON_LABELS[id];

// Backward-compatible named exports for older compositions.
export const IconReddit = RedditIcon;
export const IconBrain = MemoryIcon;
