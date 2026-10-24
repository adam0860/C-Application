import { useId } from 'react';
import type { CourseId } from '../content/types';

/** Course emblems: a hexagon "C++" badge and a ringed "U" badge (generic, not official logos). */
export function CourseGlyph({ course, size = 48, className }: { course: CourseId; size?: number; className?: string }) {
  // Gradient ids must be unique per instance: a duplicate id inside a hidden
  // (display: none) subtree makes every other reference to it render empty.
  const gid = `g-${course}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  if (course === 'cpp') {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5b8cff" />
            <stop offset="1" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <path d="M32 3l25 14.5v29L32 61 7 46.5v-29z" fill={`url(#${gid})`} />
        <path d="M32 3l25 14.5L32 32z" fill="#ffffff" opacity="0.12" />
        <text x="32" y="39.5" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="800" fontSize="19" fill="#fff" letterSpacing="-1">
          C++
        </text>
      </svg>
    );
  }
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="0.55" stopColor="#6d28d9" />
          <stop offset="1" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill={`url(#${gid})`} />
      <circle cx="32" cy="32" r="22.5" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
      <path d="M24 19v15.5a8 8 0 0 0 16 0V19" fill="none" stroke="#fff" strokeWidth="5.5" strokeLinecap="round" />
      <path d="M44 17l-4 2" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}
