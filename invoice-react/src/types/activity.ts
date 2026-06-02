export type LiveActivityKind =
  | 'listening'
  | 'processing'
  | 'scanning'
  | 'done'
  | 'error';

export interface LiveActivity {
  kind: LiveActivityKind;
  label: string;
}
