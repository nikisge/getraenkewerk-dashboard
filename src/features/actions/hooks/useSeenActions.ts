import { useState, useEffect } from "react";

const SEEN_ACTIONS_KEY = "getraenkewerk_seen_actions";

export function useSeenActions() {
  const [seenActionIds, setSeenActionIds] = useState<number[]>(() => {
    try {
      const stored = localStorage.getItem(SEEN_ACTIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const markAsSeen = (actionId: number) => {
    setSeenActionIds(prev => {
      if (prev.includes(actionId)) return prev;
      const updated = [...prev, actionId];
      localStorage.setItem(SEEN_ACTIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const markAllAsSeen = (actionIds: number[]) => {
    setSeenActionIds(prev => {
      const updated = [...new Set([...prev, ...actionIds])];
      localStorage.setItem(SEEN_ACTIONS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const isUnseen = (actionId: number) => !seenActionIds.includes(actionId);

  return { seenActionIds, markAsSeen, markAllAsSeen, isUnseen };
}
