export type LiveActivityKind =
  | 'listening'
  | 'processing'
  | 'scanning'
  | 'done'
  | 'error'
  | 'info'; // transient announcement of a navigation / selection change

export interface LiveActivity {
  kind: LiveActivityKind;
  label: string;
}
