import type { SVGProps } from 'react';

import {createLucideIcon} from 'lucide-react';

export interface LabIconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

// 1. Dashboard / Central Lab Hub
export function LabIconHome({ size = 20, className = '', ...props }: LabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`lab-icon ${className}`} {...props}>
      <path d="M3 10.2L12 3l9 7.2V20a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 20V10.2z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 21v-7.2a1.2 1.2 0 0 1 1.2-1.2h3.6a1.2 1.2 0 0 1 1.2 1.2V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="7.8" r="1.2" fill="currentColor" />
    </svg>
  );
}

// 2. Log Sample / Volumetric Intake Flask
export function LabIconIntake({ size = 20, className = '', ...props }: LabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`lab-icon ${className}`} {...props}>
      <path d="M10 2.5h4M10 2.5v5l-5.6 10.4A2 2 0 0 0 6.1 21h11.8a2 2 0 0 0 1.7-3.1L14 7.5v-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.8 16.5l10.4 0c-.8 2.6-2.4 4.5-5.2 4.5s-4.4-1.9-5.2-4.5z" fill="currentColor" fillOpacity="0.25" />
      <path d="M8 14h3M7.2 16.8h4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
      <circle cx="14.2" cy="18.2" r="0.9" fill="currentColor" />
      <circle cx="11.5" cy="15.2" r="0.7" fill="currentColor" />
    </svg>
  );
}

// 3. Samples / Sample Registry & Optical Scope
export function LabIconSearch({ size = 20, className = '', ...props }: LabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`lab-icon ${className}`} {...props}>
      <circle cx="10.5" cy="10.5" r="7.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="10.5" cy="10.5" r="3.2" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" opacity="0.75" />
      <circle cx="10.5" cy="10.5" r="1.1" fill="currentColor" />
      <path d="M16 16l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// 4. Worksheet / Multi-assay Laboratory Grid
export function LabIconWorksheet({ size = 20, className = '', ...props }: LabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`lab-icon ${className}`} {...props}>
      <rect x="3" y="3.5" width="18" height="17" rx="3" fill="currentColor" fillOpacity="0.16" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 8.5h18M8.5 8.5v12M15 8.5v12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="9.5" y="10" width="4.5" height="4" rx="1" fill="currentColor" fillOpacity="0.32" />
    </svg>
  );
}

// 5. Results & Reports / Accredited Certificate Dossier
export function LabIconReports({ size = 20, className = '', ...props }: LabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`lab-icon ${className}`} {...props}>
      <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2h6.8a2 2 0 0 1 1.4.6l3.7 3.7c.4.4.6.9.6 1.4V19.5a2.5 2.5 0 0 1-2.5 2.5h-10A2.5 2.5 0 0 1 5 19.5V4.5z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M15 2.5v4.2a1 1 0 0 0 1 1h4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 11h7M8.5 14.5h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="15.8" cy="17.2" r="2.2" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

// 6. File Library / Specimen & Document Archive
export function LabIconLibrary({ size = 20, className = '', ...props }: LabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`lab-icon ${className}`} {...props}>
      <path d="M2.5 6.5A2.5 2.5 0 0 1 5 4h4.2c.7 0 1.3.3 1.8.8l1.4 1.7c.4.5 1 .8 1.6.8H19a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 19 21.3H5a2.5 2.5 0 0 1-2.5-2.5v-12.3z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M2.5 9.5h19" stroke="currentColor" strokeWidth="1.4" opacity="0.75" />
      <circle cx="7.5" cy="15.5" r="1.3" fill="currentColor" />
    </svg>
  );
}

// 7. Shared Tools / Synchronized Multi-Analyst Workbench
export function LabIconShared({ size = 20, className = '', ...props }: LabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`lab-icon ${className}`} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2.8" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4.5" y="5.5" width="6.5" height="13" rx="1.5" fill="currentColor" fillOpacity="0.22" />
      <rect x="13" y="5.5" width="6.5" height="13" rx="1.5" fill="currentColor" fillOpacity="0.22" />
      <path d="M12 4v16" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2 2" opacity="0.8" />
    </svg>
  );
}

// 8. Smart Assistant / Laboratory AI Intelligence Core
export function LabIconAssistant({ size = 20, className = '', ...props }: LabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`lab-icon ${className}`} {...props}>
      <rect x="3.5" y="6" width="17" height="13" rx="3.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.5" cy="12.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="12.5" r="1.5" fill="currentColor" />
      <path d="M11 15.5h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 2.5v3.5M9.5 2.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="2" cy="12.5" r="1" fill="currentColor" />
      <circle cx="22" cy="12.5" r="1" fill="currentColor" />
    </svg>
  );
}

// 9. Sync with Database / Precision Dual Orbit
export function LabIconSync({ size = 20, className = '', ...props }: LabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`lab-icon ${className}`} {...props}>
      <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 21v-5h5M21 3v5h-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.2" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

// 10. Settings / Calibrated Instrument Gear
export function LabIconSettings({ size = 20, className = '', ...props }: LabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={`lab-icon ${className}`} {...props}>
      <circle cx="12" cy="12" r="3.2" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.6" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// 11. Action Buttons: Add / Intake
export function LabIconPlus({ size = 18, className = '', ...props }: LabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={`lab-icon ${className}`} {...props}>
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeOpacity="0.16" strokeWidth="4" strokeLinecap="round" />
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

// 12. Action Buttons: Reports Dossier
export function LabIconDossier({ size = 18, className = '', ...props }: LabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={`lab-icon ${className}`} {...props}>
      <path d="M4 3a2 2 0 0 1 2-2h5.5l4.5 4.5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V3z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M11.5 1v4.5H16" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.5 9h7M6.5 12h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// 13. Action Buttons: Folder Vault
export function LabIconArchive({ size = 18, className = '', ...props }: LabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={`lab-icon ${className}`} {...props}>
      <path d="M2.5 4.5A1.5 1.5 0 0 1 4 3h3.5c.5 0 1 .3 1.3.7l1 1.2c.3.3.7.6 1.2.6H16A1.5 1.5 0 0 1 17.5 7v9a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 16V4.5z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2.5 7.5h15" stroke="currentColor" strokeWidth="1.3" opacity="0.75" />
    </svg>
  );
}

// 14. Tactile Row Action Arrow
export function LabIconArrow({ size = 16, className = '', ...props }: LabIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className={`lab-icon ${className}`} {...props}>
      <circle cx="10" cy="10" r="8.5" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8.5 6.5l3.8 3.5-3.8 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export {
  LabIconHome as Home, LabIconIntake as FlaskConical, LabIconSearch as Search,
  LabIconWorksheet as Table2, LabIconReports as FileText, LabIconLibrary as FolderOpen,
  LabIconShared as Columns3, LabIconAssistant as Bot, LabIconSync as RefreshCw,
  LabIconSettings as Settings, LabIconSettings as Settings2, LabIconPlus as Plus,
  LabIconDossier as ClipboardList,
};

// Shared actions use the same filled surfaces and precise strokes as the lab rail.
export const Sparkles = createLucideIcon('LabSpark', [
  ['path', {d:'M12 2.5 14.5 9l6.5 2.5-6.5 2.5-2.5 7-2.5-7L3 11.5 9.5 9Z', fill:'currentColor', fillOpacity:'.18', key:'core'}],
  ['path', {d:'M19 2v4M17 4h4M3 18v3M1.5 19.5h3', key:'satellites'}],
]);
export const SlidersHorizontal = createLucideIcon('LabFilters', [
  ['path', {d:'M3 6h18M3 12h18M3 18h18', opacity:'.45', key:'rails'}],
  ['path', {d:'M6 3.5h4v5H6ZM14 9.5h4v5h-4ZM8 15.5h4v5H8Z', fill:'currentColor', key:'controls'}],
]);
export const Save = createLucideIcon('LabSave', [
  ['path', {d:'M5 3h12l4 4v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z', fill:'currentColor', fillOpacity:'.16', key:'body'}],
  ['path', {d:'M7 3v6h10V3M7 21v-7h10v7M14 5v2', key:'detail'}],
]);
export const Send = createLucideIcon('LabSend', [
  ['path', {d:'m3 4 18 8-18 8 3-8Z', fill:'currentColor', fillOpacity:'.2', key:'plane'}],
  ['path', {d:'M6 12h15', key:'fold'}],
]);
export const MessageSquare = createLucideIcon('LabMessage', [
  ['path', {d:'M5 3.5h14A2.5 2.5 0 0 1 21.5 6v10a2.5 2.5 0 0 1-2.5 2.5H9l-6.5 3V6A2.5 2.5 0 0 1 5 3.5Z', fill:'currentColor', fillOpacity:'.16', key:'bubble'}],
  ['path', {d:'M7 9h10M7 13h6', key:'text'}],
]);
export const User = createLucideIcon('LabUser', [
  ['circle', {cx:'12', cy:'7', r:'4', fill:'currentColor', fillOpacity:'.2', key:'head'}],
  ['path', {d:'M4 21v-2a8 6 0 0 1 16 0v2Z', fill:'currentColor', fillOpacity:'.16', key:'body'}],
]);
export const Users = createLucideIcon('LabUsers', [
  ['circle', {cx:'9', cy:'7', r:'3.5', fill:'currentColor', fillOpacity:'.2', key:'head'}],
  ['path', {d:'M2 20v-2a7 5.5 0 0 1 14 0v2ZM17 4a3.5 3.5 0 0 1 0 7M19 14a5 5 0 0 1 3 4v2', key:'group'}],
]);
export const Trash2 = createLucideIcon('LabDelete', [
  ['path', {d:'m5 7 1 13h12l1-13Z', fill:'currentColor', fillOpacity:'.15', key:'bin'}],
  ['path', {d:'M3 5h18M8 5V2h8v3M10 10v7M14 10v7', key:'lid'}],
]);
export const CalendarDays = createLucideIcon('LabCalendar', [
  ['rect', {x:'3', y:'5', width:'18', height:'16', rx:'3', fill:'currentColor', fillOpacity:'.14', key:'calendar'}],
  ['path', {d:'M3 10h18M8 2v5M16 2v5M14 14h3M7 18h3', key:'binding'}],
  ['rect', {x:'7', y:'13', width:'3', height:'3', rx:'.5', fill:'currentColor', key:'day'}],
]);
export const Sun = createLucideIcon('LabSun', [
  ['circle', {cx:'12', cy:'12', r:'4', fill:'currentColor', fillOpacity:'.2', key:'sun'}],
  ['path', {d:'M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4', key:'rays'}],
]);
export const Moon = createLucideIcon('LabMoon', [
  ['path', {d:'M20.8 14.2A9 9 0 0 1 9.8 3.3a9 9 0 1 0 11 10.9Z', fill:'currentColor', fillOpacity:'.2', key:'moon'}],
  ['path', {d:'M17 2v4M15 4h4', opacity:'.65', key:'star'}],
]);
export const ShieldCheck = createLucideIcon('LabVerified', [
  ['path', {d:'m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Z', fill:'currentColor', fillOpacity:'.17', key:'shield'}],
  ['path', {d:'m8 11 3 3 5-5', key:'check'}],
]);
export const CheckCircle2 = createLucideIcon('LabComplete', [
  ['circle', {cx:'12', cy:'12', r:'9', fill:'currentColor', fillOpacity:'.16', key:'disc'}],
  ['path', {d:'m7.5 12 3 3 6-6', key:'check'}],
]);
export const Check = createLucideIcon('LabCheck', [['path', {d:'m4 12 5.5 5.5L20 6.5', key:'check'}]]);
export const X = createLucideIcon('LabClose', [['path', {d:'m7 7 10 10M17 7 7 17', key:'close'}]]);
export const Minus = createLucideIcon('LabMinus', [['path', {d:'M5 12h14', key:'minus'}]]);
export const Menu = createLucideIcon('LabMenu', [['path', {d:'M4 6h16M4 12h10M4 18h16', key:'lines'}]]);
export const ArrowRight = createLucideIcon('LabArrowRight', [['path', {d:'M3 12h17m-6-6 6 6-6 6', key:'arrow'}]]);
export const ArrowLeft = createLucideIcon('LabArrowLeft', [['path', {d:'M21 12H4m6-6-6 6 6 6', key:'arrow'}]]);
export const ArrowUpRight = createLucideIcon('LabOpen', [['path', {d:'M5 19 19 5M8 5h11v11', key:'arrow'}]]);
export const ArrowUp = createLucideIcon('LabArrowUp', [['path', {d:'M12 21V4m-6 6 6-6 6 6', key:'arrow'}]]);
export const ArrowDown = createLucideIcon('LabArrowDown', [['path', {d:'M12 3v17m-6-6 6 6 6-6', key:'arrow'}]]);
export const ArrowUpDown = createLucideIcon('LabSort', [['path', {d:'M8 20V4L4 8m4-4 4 4M16 4v16l-4-4m4 4 4-4', key:'sort'}]]);
export const ChevronDown = createLucideIcon('LabChevronDown', [['path', {d:'m6 9 6 6 6-6', key:'chevron'}]]);
export const ChevronLeft = createLucideIcon('LabChevronLeft', [['path', {d:'m14 5-7 7 7 7', key:'chevron'}]]);
export const ChevronRight = createLucideIcon('LabChevronRight', [['path', {d:'m10 5 7 7-7 7', key:'chevron'}]]);
export const Download = createLucideIcon('LabDownload', [
  ['path', {d:'M3 15v5h18v-5', fill:'currentColor', fillOpacity:'.16', key:'tray'}],
  ['path', {d:'M12 3v12m-5-5 5 5 5-5', key:'arrow'}],
]);
export const Upload = createLucideIcon('LabUpload', [
  ['path', {d:'M3 15v5h18v-5', fill:'currentColor', fillOpacity:'.16', key:'tray'}],
  ['path', {d:'M12 15V3m-5 5 5-5 5 5', key:'arrow'}],
]);
export const Cloud = createLucideIcon('LabCloud', [
  ['path', {d:'M6 19a5 5 0 0 1-1-9.9A7 7 0 0 1 18.5 8a5.5 5.5 0 0 1-.5 11Z', fill:'currentColor', fillOpacity:'.16', key:'cloud'}],
]);
export const CloudUpload = createLucideIcon('LabCloudUpload', [
  ['path', {d:'M6 19a5 5 0 0 1-1-9.9A7 7 0 0 1 18.5 8a5.5 5.5 0 0 1-.5 11', fill:'currentColor', fillOpacity:'.16', key:'cloud'}],
  ['path', {d:'M12 21V11m-3 3 3-3 3 3', key:'upload'}],
]);
export const Copy = createLucideIcon('LabCopy', [
  ['rect', {x:'8', y:'8', width:'13', height:'13', rx:'2.5', fill:'currentColor', fillOpacity:'.18', key:'front'}],
  ['path', {d:'M5 16H3V3h13v2', key:'back'}],
]);
export const ExternalLink = createLucideIcon('LabExternalLink', [
  ['path', {d:'M13 3h8v8M21 3l-9 9M9 4H4v16h16v-5', key:'open'}],
]);
export const LogOut = createLucideIcon('LabSignOut', [
  ['path', {d:'M10 3H3v18h7Z', fill:'currentColor', fillOpacity:'.18', key:'door'}],
  ['path', {d:'M9 12h12m-5-5 5 5-5 5', key:'arrow'}],
]);
export const Lock = createLucideIcon('LabLock', [
  ['rect', {x:'4', y:'10', width:'16', height:'11', rx:'3', fill:'currentColor', fillOpacity:'.18', key:'body'}],
  ['path', {d:'M8 10V6a4 4 0 0 1 8 0v4M12 14v3', key:'lock'}],
]);
export const Unlock = createLucideIcon('LabUnlock', [
  ['rect', {x:'4', y:'10', width:'16', height:'11', rx:'3', fill:'currentColor', fillOpacity:'.18', key:'body'}],
  ['path', {d:'M8 10V6a4 4 0 0 1 7.5-2M12 14v3', key:'lock'}],
]);
export const Link2 = createLucideIcon('LabLink', [
  ['path', {d:'m9 7 2-2a5 5 0 0 1 7 7l-2 2M15 17l-2 2a5 5 0 0 1-7-7l2-2M8 16l8-8', key:'links'}],
]);
export const Clock3 = createLucideIcon('LabTime', [
  ['circle', {cx:'12', cy:'12', r:'9', fill:'currentColor', fillOpacity:'.16', key:'face'}],
  ['path', {d:'M12 6v6h5', key:'hands'}],
]);
export const History = createLucideIcon('LabHistory', [
  ['path', {d:'M3 10a9 9 0 1 1 1 7M3 3v7h7M12 7v5l3 2', key:'clock'}],
]);
export const Database = createLucideIcon('LabDatabase', [
  ['ellipse', {cx:'12', cy:'5.5', rx:'8.5', ry:'3.5', fill:'currentColor', fillOpacity:'.2', key:'top'}],
  ['path', {d:'M3.5 5.5v13c0 4.7 17 4.7 17 0v-13M3.5 12c0 4.7 17 4.7 17 0', key:'body'}],
]);
export const Rows3 = createLucideIcon('LabRows', [
  ['rect', {x:'3', y:'3', width:'18', height:'18', rx:'3', fill:'currentColor', fillOpacity:'.14', key:'grid'}],
  ['path', {d:'M3 9h18M3 15h18', key:'rows'}],
]);
export const Layers = createLucideIcon('LabLayers', [
  ['path', {d:'m12 2 10 6-10 6L2 8Z', fill:'currentColor', fillOpacity:'.18', key:'top'}],
  ['path', {d:'m2 12 10 6 10-6M2 16l10 6 10-6', key:'stack'}],
]);
export const FolderTree = createLucideIcon('LabFolderTree', [
  ['path', {d:'M3 3h8v5H3ZM13 10h8v4h-8ZM13 17h8v4h-8Z', fill:'currentColor', fillOpacity:'.18', key:'folders'}],
  ['path', {d:'M6 8v10h6M6 12h6', key:'tree'}],
]);
export const PenTool = createLucideIcon('LabPen', [
  ['path', {d:'m14 3 7 7-5 10-12 1 1-12Z', fill:'currentColor', fillOpacity:'.16', key:'nib'}],
  ['path', {d:'m4 21 7-7M14 3l7 7', key:'edge'}],
  ['circle', {cx:'12', cy:'13', r:'2', key:'point'}],
]);
export const GripVertical = createLucideIcon('LabGrip', [['path', {d:'M8 5v2M16 5v2M8 11v2M16 11v2M8 17v2M16 17v2', key:'grip'}]]);
export const PanelLeftOpen = createLucideIcon('LabExpandRail', [
  ['rect', {x:'3', y:'3', width:'18', height:'18', rx:'3', key:'panel'}],
  ['path', {d:'M3 3h6v18H3Z', fill:'currentColor', fillOpacity:'.2', key:'rail'}],
  ['path', {d:'m13 9 3 3-3 3', key:'arrow'}],
]);
export const PanelLeftClose = createLucideIcon('LabCollapseRail', [
  ['rect', {x:'3', y:'3', width:'18', height:'18', rx:'3', key:'panel'}],
  ['path', {d:'M3 3h6v18H3Z', fill:'currentColor', fillOpacity:'.2', key:'rail'}],
  ['path', {d:'m16 9-3 3 3 3', key:'arrow'}],
]);
export const Scan = createLucideIcon('LabScan', [['path', {d:'M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5M6 12h12', key:'frame'}]]);
export const Maximize = createLucideIcon('LabMaximize', [['path', {d:'M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5', key:'frame'}]]);
export const Minimize = createLucideIcon('LabMinimize', [['path', {d:'M3 8h5V3M21 8h-5V3M16 21v-5h5M8 21v-5H3', key:'frame'}]]);
export const Beaker = createLucideIcon('LabBeaker', [
  ['path', {d:'M5 3h14M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3M14 7h4M14 10h4', key:'vessel'}],
  ['path', {d:'M6 13h12v6a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Z', fill:'currentColor', fillOpacity:'.2', key:'liquid'}],
]);
export const Thermometer = createLucideIcon('LabTemperature', [
  ['path', {d:'M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0Z', fill:'currentColor', fillOpacity:'.16', key:'body'}],
  ['path', {d:'M12 7v10', key:'mercury'}],
  ['circle', {cx:'12', cy:'18', r:'1.5', fill:'currentColor', key:'bulb'}],
]);
export const MapPin = createLucideIcon('LabLocation', [
  ['path', {d:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z', fill:'currentColor', fillOpacity:'.17', key:'pin'}],
  ['circle', {cx:'12', cy:'10', r:'3', key:'point'}],
]);
export const Activity = createLucideIcon('LabActivity', [['path', {d:'M2 12h5l3-8 4 16 3-8h5', key:'trace'}]]);
export const HelpCircle = createLucideIcon('LabHelp', [
  ['circle', {cx:'12', cy:'12', r:'9', fill:'currentColor', fillOpacity:'.16', key:'disc'}],
  ['path', {d:'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17h.01', key:'question'}],
]);

// 15. Category Specific Specimen Badges
export function LabSpecimenBadge({ category, size = 20 }: { category?: string | null; size?: number }) {
  const cat = category?.toUpperCase() || '';
  if (cat === 'SFG') {
    // Semi-finished blend flask
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className="lab-specimen-svg">
        <path d="M8 2h4M9 2v4l-4.2 8.4A1.5 1.5 0 0 0 6.1 16.5h7.8a1.5 1.5 0 0 0 1.3-2.1L11 6V2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6 13h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
        <circle cx="10" cy="14" r="0.8" fill="currentColor" />
      </svg>
    );
  }
  if (cat === 'FG') {
    // Finished goods sealed vial
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className="lab-specimen-svg">
        <rect x="6.5" y="4" width="7" height="13.5" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
        <rect x="5.5" y="2" width="9" height="2.5" rx="1" fill="currentColor" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6.5 8h7M6.5 11h4" stroke="currentColor" strokeWidth="1.2" opacity="0.75" />
      </svg>
    );
  }
  if (cat === 'ST' || cat === 'STAB') {
    // Stability incubation tube
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className="lab-specimen-svg">
        <path d="M7 2h6M8 2v11.5a2 2 0 0 0 4 0V2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 7h4M8 10h4" stroke="currentColor" strokeWidth="1.2" opacity="0.75" />
      </svg>
    );
  }
  if (cat === 'WS' || cat === 'WATER') {
    // Water droplet with ripple
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className="lab-specimen-svg">
        <path d="M10 2.5C8 5.5 5 9.5 5 12.8a5 5 0 0 0 10 0c0-3.3-3-7.3-5-10.3z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M8.2 12a2 2 0 0 0 2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  if (cat === 'EM') {
    // Environmental petri plate
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className="lab-specimen-svg">
        <ellipse cx="10" cy="10" rx="7.5" ry="5.5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
        <ellipse cx="10" cy="11.5" rx="6" ry="3.8" stroke="currentColor" strokeWidth="1.2" opacity="0.65" />
        <circle cx="8" cy="10.5" r="0.9" fill="currentColor" />
        <circle cx="11.5" cy="10" r="0.8" fill="currentColor" />
        <circle cx="12.5" cy="12" r="0.7" fill="currentColor" />
      </svg>
    );
  }
  if (cat === 'RM') {
    // Raw materials batch drum
    return (
      <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className="lab-specimen-svg">
        <ellipse cx="10" cy="5" rx="6.5" ry="2.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3.5 5v9.5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5V5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M3.5 10c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
      </svg>
    );
  }
  // Default / Misc
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" className="lab-specimen-svg">
      <circle cx="10" cy="10" r="7.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" opacity="0.8" />
      <circle cx="10" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}
