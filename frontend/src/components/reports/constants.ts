// Color palette — deep, professional tones with intentional weight
export const COLORS = {
  primary: "#004ac6",
  primaryLight: "#2563eb",
  success: "#059669",
  successLight: "#10b981",
  warning: "#d97706",
  danger: "#dc2626",
  muted: "#94a3b8",
  blue: "#2563eb",
  purple: "#7c3aed",
  pink: "#db2777",
  cyan: "#0891b2",
  orange: "#ea580c",
  teal: "#0d9488",
};

export const STATUS_COLORS: Record<string, string> = {
  completed: COLORS.success,
  cancelled: COLORS.danger,
  no_show: COLORS.warning,
  pending: COLORS.muted,
  confirmed: COLORS.blue,
};

// Shared chart tooltip style — glass effect per DESIGN.md
export const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--background) / 0.92)',
  border: 'none',
  borderRadius: '12px',
  boxShadow: '0 8px 32px hsl(var(--foreground) / 0.06)',
  backdropFilter: 'blur(24px)',
  color: 'hsl(var(--foreground))',
  padding: '12px 16px',
};

// Common chart axis props
export const AXIS_TICK_STYLE = { 
  fontSize: 11, 
  fill: 'hsl(var(--muted-foreground))' 
};

export const GRID_STROKE = "hsl(var(--muted-foreground) / 0.1)";
