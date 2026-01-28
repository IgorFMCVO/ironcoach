// src/components/Icons.tsx
// ============================================================================
// IRON COACH - Biblioteca de Ícones SVG Profissionais
// Design System: Minimalista, Fitness-focused, Modern
// ============================================================================

import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

// ============================================================================
// ÍCONES DE CARGO/ROLE
// ============================================================================

export const AdminIcon = ({ size = 16, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
      fill={color}
      fillOpacity="0.2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const SupervisorIcon = ({ size = 16, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect
      x="3"
      y="3"
      width="18"
      height="18"
      rx="2"
      fill={color}
      fillOpacity="0.2"
      stroke={color}
      strokeWidth="2"
    />
    <path d="M9 12L11 14L15 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CoachIcon = ({ size = 16, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="9" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
    <circle cx="12" cy="12" r="3" fill={color} />
  </svg>
);

// ============================================================================
// ÍCONES DE AÇÃO
// ============================================================================

export const AddUserIcon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="2" />
    <path d="M6 21V19C6 16.7909 7.79086 15 10 15H14C16.2091 15 18 16.7909 18 19V21" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M20 8V14M17 11H23" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const SearchIcon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="2" />
    <path d="M21 21L16 16" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const CloseIcon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const CheckIcon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M5 12L10 17L20 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const AlertIcon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 2L2 20H22L12 2Z"
      fill={color}
      fillOpacity="0.2"
      stroke={color}
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <path d="M12 9V13M12 17H12.01" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ============================================================================
// ÍCONES DE NAVEGAÇÃO
// ============================================================================

export const DashboardIcon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="3" y="3" width="7" height="7" rx="1" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2" />
    <rect x="14" y="3" width="7" height="7" rx="1" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="2" />
    <rect x="3" y="14" width="7" height="7" rx="1" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="2" />
    <rect x="14" y="14" width="7" height="7" rx="1" fill={color} fillOpacity="0.1" stroke={color} strokeWidth="2" />
  </svg>
);

export const SettingsIcon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" />
    <path
      d="M19.4 15C19.1277 15.6171 19.2583 16.3378 19.73 16.82L19.79 16.88C20.1656 17.2551 20.3766 17.7642 20.3766 18.295C20.3766 18.8258 20.1656 19.3349 19.79 19.71C19.4149 20.0856 18.9058 20.2966 18.375 20.2966C17.8442 20.2966 17.3351 20.0856 16.96 19.71L16.9 19.65C16.4178 19.1783 15.6971 19.0477 15.08 19.32C14.4755 19.5791 14.0826 20.1724 14.08 20.83V21C14.08 22.1046 13.1846 23 12.08 23C10.9754 23 10.08 22.1046 10.08 21V20.91C10.0642 20.2327 9.63587 19.6339 9 19.4C8.38291 19.1277 7.66219 19.2583 7.18 19.73L7.12 19.79C6.74493 20.1656 6.23584 20.3766 5.705 20.3766C5.17416 20.3766 4.66507 20.1656 4.29 19.79C3.91445 19.4149 3.70343 18.9058 3.70343 18.375C3.70343 17.8442 3.91445 17.3351 4.29 16.96L4.35 16.9C4.82167 16.4178 4.95231 15.6971 4.68 15.08C4.42093 14.4755 3.82764 14.0826 3.17 14.08H3C1.89543 14.08 1 13.1846 1 12.08C1 10.9754 1.89543 10.08 3 10.08H3.09C3.76733 10.0642 4.36613 9.63587 4.6 9C4.87231 8.38291 4.74167 7.66219 4.27 7.18L4.21 7.12C3.83445 6.74493 3.62343 6.23584 3.62343 5.705C3.62343 5.17416 3.83445 4.66507 4.21 4.29C4.58507 3.91445 5.09416 3.70343 5.625 3.70343C6.15584 3.70343 6.66493 3.91445 7.04 4.29L7.1 4.35C7.58219 4.82167 8.30291 4.95231 8.92 4.68H9C9.60447 4.42093 9.99738 3.82764 10 3.17V3C10 1.89543 10.8954 1 12 1C13.1046 1 14 1.89543 14 3V3.09C14.0026 3.74764 14.3955 4.34093 15 4.6C15.6171 4.87231 16.3378 4.74167 16.82 4.27L16.88 4.21C17.2551 3.83445 17.7642 3.62343 18.295 3.62343C18.8258 3.62343 19.3349 3.83445 19.71 4.21C20.0856 4.58507 20.2966 5.09416 20.2966 5.625C20.2966 6.15584 20.0856 6.66493 19.71 7.04L19.65 7.1C19.1783 7.58219 19.0477 8.30291 19.32 8.92V9C19.5791 9.60447 20.1724 9.99738 20.83 10H21C22.1046 10 23 10.8954 23 12C23 13.1046 22.1046 14 21 14H20.91C20.2524 14.0026 19.6591 14.3955 19.4 15Z"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const GuideIcon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M4 19.5C4 18.1193 5.11929 17 6.5 17H20" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.5 2H20V22H6.5C5.11929 22 4 20.8807 4 19.5V4.5C4 3.11929 5.11929 2 6.5 2Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 7H15M9 11H13" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ============================================================================
// ÍCONES DE STATUS/PRIORIDADE (FITNESS THEMED)
// ============================================================================

export const FireIcon = ({ size = 16, color = '#FF3B30', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
      fill={color}
      fillOpacity="0.2"
    />
    <path
      d="M13.5 5C13.5 5 14 7.5 14 9.5C14 11.5 12.5 13 10.5 13C8.5 13 7 11.5 7 9.5C7 9.5 7 10.5 8.5 12.5C8.5 12.5 6 14 6 17C6 19.5 8.5 21 12 21C15.5 21 18 19.5 18 17C18 12 13.5 5 13.5 5Z"
      fill={color}
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const HeartbeatIcon = ({ size = 16, color = '#FF3B30', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M3 12H7L10 6L14 18L17 12H21"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const DumbbellIcon = ({ size = 16, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M6.5 6.5L17.5 17.5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <rect x="2" y="8" width="4" height="8" rx="1" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" />
    <rect x="18" y="8" width="4" height="8" rx="1" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" />
    <rect x="5" y="10" width="2" height="4" rx="0.5" fill={color} />
    <rect x="17" y="10" width="2" height="4" rx="0.5" fill={color} />
  </svg>
);

export const TimerIcon = ({ size = 16, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="13" r="8" stroke={color} strokeWidth="2" />
    <path d="M12 9V13L15 15" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M9 2H15" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const TrophyIcon = ({ size = 16, color = '#FFD700', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M6 9H4C3.44772 9 3 8.55228 3 8V5C3 4.44772 3.44772 4 4 4H6"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M18 9H20C20.5523 9 21 8.55228 21 8V5C21 4.44772 20.5523 4 20 4H18"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M6 4H18V11C18 14.3137 15.3137 17 12 17V17C8.68629 17 6 14.3137 6 11V4Z"
      fill={color}
      fillOpacity="0.2"
      stroke={color}
      strokeWidth="2"
    />
    <path d="M12 17V20" stroke={color} strokeWidth="2" />
    <path d="M8 21H16" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ============================================================================
// ÍCONES DE ESTADO
// ============================================================================

export const LoadingIcon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`}>
    <circle cx="12" cy="12" r="10" stroke={color} strokeOpacity="0.2" strokeWidth="3" />
    <path d="M12 2C6.47715 2 2 6.47715 2 12" stroke={color} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const EntryIcon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M15 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H15" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M10 17L15 12L10 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M15 12H3" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ExitIcon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M9 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H9" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <path d="M16 17L21 12L16 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 12H9" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const UserIcon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="8" r="4" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
    <path
      d="M6 21V19C6 16.7909 7.79086 15 10 15H14C16.2091 15 18 16.7909 18 19V21"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const UsersIcon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="9" cy="7" r="3" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="2" />
    <path d="M4 21V19C4 17.3431 5.34315 16 7 16H11C12.6569 16 14 17.3431 14 19V21" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <circle cx="17" cy="7" r="3" stroke={color} strokeWidth="2" />
    <path d="M17 16C18.6569 16 20 17.3431 20 19V21" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ============================================================================
// ÍCONE DE NOTIFICAÇÃO
// ============================================================================

export const BellIcon = ({ size = 20, color = 'currentColor', className }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
      fill={color}
      fillOpacity="0.2"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default {
  AdminIcon,
  SupervisorIcon,
  CoachIcon,
  AddUserIcon,
  SearchIcon,
  CloseIcon,
  CheckIcon,
  AlertIcon,
  DashboardIcon,
  SettingsIcon,
  GuideIcon,
  FireIcon,
  HeartbeatIcon,
  DumbbellIcon,
  TimerIcon,
  TrophyIcon,
  LoadingIcon,
  EntryIcon,
  ExitIcon,
  UserIcon,
  UsersIcon,
  BellIcon,
};
