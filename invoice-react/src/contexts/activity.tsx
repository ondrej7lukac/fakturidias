import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { LiveActivity } from '@/types/activity';

interface ActivityContextValue {
  liveActivity: LiveActivity | null;
  settingsTab: number;
  announce: (activity: LiveActivity | null) => void;
  setSettingsTab: (tab: number) => void;
}

const ActivityContext = createContext<ActivityContextValue>({
  liveActivity: null,
  settingsTab: 1,
  announce: () => {},
  setSettingsTab: () => {},
});

export function ActivityProvider({ children }: { children: ReactNode }) {
  const [liveActivity, setLiveActivity] = useState<LiveActivity | null>(null);
  const [settingsTab, setSettingsTab] = useState(1);

  // Auto-clear transient states (done / error / info) after 1.8 s
  useEffect(() => {
    if (
      liveActivity?.kind === 'done' ||
      liveActivity?.kind === 'error' ||
      liveActivity?.kind === 'info'
    ) {
      const id = setTimeout(() => setLiveActivity(null), 1800);
      return () => clearTimeout(id);
    }
  }, [liveActivity]);

  const announce = useCallback((activity: LiveActivity | null) => {
    setLiveActivity(activity);
  }, []);

  return (
    <ActivityContext.Provider
      value={{ liveActivity, settingsTab, announce, setSettingsTab }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useLiveActivity() {
  return useContext(ActivityContext);
}
