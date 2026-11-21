import { useId } from 'react';
import type { CourseId } from '../content/types';

/** Course emblems: a hexagon "C++" badge, a ringed "U" badge and a green game-window badge (generic, not official logos). */
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
  if (course === 'arch') {
    // A CPU die with pins.
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset="0.55" stopColor="#0e7490" />
            <stop offset="1" stopColor="#b45309" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="15" fill={`url(#${gid})`} />
        {[20, 28, 36, 44].map((p) => (
          <g key={p} stroke="#fde68a" strokeWidth="2.4" strokeLinecap="round" opacity="0.9">
            <path d={`M${p} 10v6 M${p} 48v6 M10 ${p}h6 M48 ${p}h6`} />
          </g>
        ))}
        <rect x="17" y="17" width="30" height="30" rx="5" fill="#082f49" opacity="0.75" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" />
        <rect x="25" y="25" width="14" height="14" rx="2.5" fill="#fbbf24" />
      </svg>
    );
  }
  if (course === 'os') {
    // Stacked windows with a terminal prompt.
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fb7185" />
            <stop offset="0.5" stopColor="#be123c" />
            <stop offset="1" stopColor="#6d28d9" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="15" fill={`url(#${gid})`} />
        <rect x="16" y="11" width="36" height="28" rx="4" fill="#fff" opacity="0.25" />
        <rect x="11" y="20" width="38" height="31" rx="4.5" fill="#1e0a1e" opacity="0.8" />
        <rect x="11" y="20" width="38" height="7" rx="3.5" fill="#fff" opacity="0.3" />
        <path d="M17 34l5 4-5 4" fill="none" stroke="#fda4af" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M26 43h11" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (course === 'sfml') {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4d7c0f" />
            <stop offset="0.5" stopColor="#16a34a" />
            <stop offset="1" stopColor="#065f46" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="58" height="58" rx="15" fill={`url(#${gid})`} />
        <rect x="11" y="14" width="42" height="36" rx="5" fill="#052e16" opacity="0.55" />
        <rect x="11" y="14" width="42" height="8" rx="4" fill="#fff" opacity="0.28" />
        <circle cx="16" cy="18" r="1.6" fill="#fff" />
        <circle cx="21" cy="18" r="1.6" fill="#fff" opacity="0.8" />
        <rect x="21" y="30" width="9" height="9" rx="1.5" fill="#bef264" />
        <circle cx="42" cy="38" r="5.5" fill="#fff" opacity="0.92" />
        <path d="M13 46h38" stroke="#bef264" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
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
