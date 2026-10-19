/**
 * One icon set for the whole site: 24px grid, 1.5 stroke, round caps and joins.
 * Replaces the inline SVGs that were spread over six files in three stroke widths.
 */

const PATHS = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  'chevron-down': <path d="M6 9l6 6 6-6" />,
  'chevron-left': <path d="M15 6l-6 6 6 6" />,
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  'arrow-left': <path d="M19 12H5M11 6l-6 6 6 6" />,
  pin: (
    <>
      <path d="M12 21c-3-2.5-7-7.2-7-11a7 7 0 1 1 14 0c0 3.8-4 8.5-7 11z" />
      <circle cx="12" cy="10" r="2.25" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" />
      <rect x="13.5" y="3.5" width="7" height="7" />
      <rect x="3.5" y="13.5" width="7" height="7" />
      <rect x="13.5" y="13.5" width="7" height="7" />
    </>
  ),
  strip: (
    <>
      <rect x="6.5" y="5.5" width="11" height="13" />
      <path d="M3 7v10M21 7v10" />
    </>
  ),
  expand: <path d="M14 4h6v6M10 20H4v-6M20 4l-6 6M4 20l6-6" />,
  collapse: <path d="M4 14h6v6M20 10h-6V4M10 14l-6 6M14 10l6-6" />,
  share: (
    <>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="M8.2 13.3l7.6 4M15.8 6.7l-7.6 4" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  copy: (
    <>
      <rect x="8.5" y="8.5" width="11" height="11" />
      <path d="M15.5 8.5v-4h-11v11h4" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" />
      <path d="M4 6.5l8 6 8-6" />
    </>
  ),
  phone: (
    <path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" />
  ),
  'panel-close': (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" />
      <path d="M9.5 4.5v15M15.5 10l-2 2 2 2" />
    </>
  ),
  'panel-open': (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" />
      <path d="M9.5 4.5v15M13.5 10l2 2-2 2" />
    </>
  ),
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r=".6" fill="currentColor" />
    </>
  ),
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-12h4v1.5A4.5 4.5 0 0 1 16 8z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  grip: (
    <>
      {[6, 12, 18].flatMap((y) =>
        [9, 15].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="currentColor" />)
      )}
    </>
  ),
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  plus: <path d="M12 5v14M5 12h14" />,
  upload: <path d="M12 15V4M7 9l5-5 5 5M4 15v5h16v-5" />,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <path d="M4 4l16 16M10 6a9 9 0 0 1 2-.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 7.6A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4-1M9.9 10a3 3 0 0 0 4.1 4.1" />
  ),
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />,
  monitor: (
    <>
      <rect x="3" y="4.5" width="18" height="12" />
      <path d="M9 20h6M12 16.5V20" />
    </>
  ),
  mobile: (
    <>
      <rect x="7" y="3" width="10" height="18" />
      <path d="M11 18h2" />
    </>
  ),
  logout: <path d="M15 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />,
  home: <path d="M4 11l8-7 8 7v9h-5v-6h-6v6H4z" />,
  photo: (
    <>
      <rect x="3.5" y="4.5" width="17" height="15" />
      <circle cx="9" cy="10" r="1.75" />
      <path d="M4 18l5-5 4 4 3-3 4 4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.75" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({
  name,
  size = 20,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
