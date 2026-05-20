/* Inline Lucide-style icons matching the icon list in design-system/components/icons.md.
   Strokes are 2 by default. Exported to window for use across all jsx files. */

const _ic = (paths, viewBox = "0 0 24 24") => ({ size = 16, strokeWidth = 2, ...rest } = {}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {paths}
  </svg>
);

const Settings2 = _ic(<>
  <path d="M20 7h-9" /><path d="M14 17H5" />
  <circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
</>);

const Contact = _ic(<>
  <path d="M16 2v2" /><path d="M7 22v-2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
  <path d="M8 2v2" /><circle cx="12" cy="11" r="3" />
  <rect x="3" y="4" width="18" height="18" rx="2" />
</>);

const Wallet = _ic(<>
  <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
  <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
</>);

const Plug = _ic(<>
  <path d="M12 22v-5" /><path d="M9 8V2" /><path d="M15 8V2" />
  <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z" />
</>);

const Save = _ic(<>
  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
  <path d="M17 21v-8H7v8" /><path d="M7 3v5h8" />
</>);

const BarChart2 = _ic(<>
  <line x1="18" x2="18" y1="20" y2="10" />
  <line x1="12" x2="12" y1="20" y2="4" />
  <line x1="6" x2="6" y1="20" y2="14" />
</>);

const FileText = _ic(<>
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
  <polyline points="14 2 14 8 20 8" /><line x1="16" x2="8" y1="13" y2="13" />
  <line x1="16" x2="8" y1="17" y2="17" /><line x1="10" x2="8" y1="9" y2="9" />
</>);

const Check = _ic(<polyline points="20 6 9 17 4 12" />);

const CheckCircle2 = _ic(<>
  <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
</>);

const X = _ic(<>
  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
</>);

const Menu = _ic(<>
  <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" />
  <line x1="4" x2="20" y1="18" y2="18" />
</>);

const Pencil = _ic(<>
  <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
</>);

const Eye = _ic(<>
  <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
  <circle cx="12" cy="12" r="3" />
</>);

const AlertTriangle = _ic(<>
  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
  <line x1="12" x2="12" y1="9" y2="13" /><line x1="12" x2="12.01" y1="17" y2="17" />
</>);

const Cloud = _ic(<>
  <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
</>);

const Mail = _ic(<>
  <rect width="20" height="16" x="2" y="4" rx="2" />
  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
</>);

const RefreshCw = _ic(<>
  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" />
  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" />
</>);

const ArrowLeftRight = _ic(<>
  <path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" />
</>);

const Sparkles = _ic(<>
  <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.582a.5.5 0 0 1 0 .962L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
  <path d="M20 3v4" /><path d="M22 5h-4" /><path d="M4 17v2" /><path d="M5 18H3" />
</>);

const Mic = _ic(<>
  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
  <path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" />
</>);

const MicOff = _ic(<>
  <line x1="2" x2="22" y1="2" y2="22" /><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
  <path d="M5 10v2a7 7 0 0 0 12 5" /><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
  <path d="M9 9v3a3 3 0 0 0 5.12 2.12" /><line x1="12" x2="12" y1="19" y2="22" />
</>);

const Search = _ic(<>
  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
</>);

const Calendar = _ic(<>
  <path d="M8 2v4" /><path d="M16 2v4" />
  <rect width="18" height="18" x="3" y="4" rx="2" />
  <path d="M3 10h18" />
</>);

const ChevronDown = _ic(<path d="m6 9 6 6 6-6" />);
const ChevronRight = _ic(<path d="m9 18 6-6-6-6" />);
const ArrowUp = _ic(<><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></>);
const ArrowDown = _ic(<><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></>);
const Plus = _ic(<><path d="M5 12h14" /><path d="M12 5v14" /></>);
const Trash = _ic(<>
  <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
</>);
const Send = _ic(<>
  <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
  <path d="m21.854 2.147-10.94 10.939" />
</>);

Object.assign(window, {
  ICON_SM: 14, ICON_MD: 16, ICON_LG: 18, STROKE: 2,
  Settings2, Contact, Wallet, Plug, Save, BarChart2, FileText,
  Check, CheckCircle2, X, Menu, Pencil, Eye, AlertTriangle,
  Cloud, Mail, RefreshCw, ArrowLeftRight, Sparkles, Mic, MicOff,
  Search, Calendar, ChevronDown, ChevronRight, ArrowUp, ArrowDown,
  Plus, Trash, Send,
});
