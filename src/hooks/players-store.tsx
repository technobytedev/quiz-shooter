import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import {
  addPlayer,
  nameError,
  recordGame as withGame,
  renamePlayer as withName,
  type NameError,
  type Player,
} from '@/game/players';
import type { SubjectId } from '@/game/subjects';

import { loadPlayers, savePlayers } from './players-storage';

interface PlayersValue {
  // False until the saved players have loaded; nothing can be created before then.
  loaded: boolean;
  players: Player[];
  // The new player's id, or why the name was refused.
  createPlayer(name: string): { id: string } | { error: NameError };
  // Null when renamed, or why the name was refused.
  renamePlayer(id: string, name: string): NameError | null;
  recordGame(id: string, subject: SubjectId, score: number): void;
}

const PlayersContext = createContext<PlayersValue | null>(null);

function newPlayerId(): string {
  return `p-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

// The app's one shared copy of the players, saved to the phone after every change.
export function PlayersProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  // The latest list and whether saving is allowed, for the change functions below to read without
  // waiting for a re-render.
  const latest = useRef<Player[]>([]);
  const canSave = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadPlayers(AsyncStorage, newPlayerId, Date.now()).then((result) => {
      if (cancelled) return;
      latest.current = result.players;
      canSave.current = result.canSave;
      setPlayers(result.players);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const commit = useCallback((next: Player[]) => {
    latest.current = next;
    setPlayers(next);
    if (canSave.current) void savePlayers(AsyncStorage, next);
  }, []);

  const createPlayer = useCallback(
    (name: string) => {
      const error = nameError(name, latest.current);
      if (error) return { error };
      const id = newPlayerId();
      commit(addPlayer(latest.current, name, id, Date.now()));
      return { id };
    },
    [commit],
  );

  const renamePlayer = useCallback(
    (id: string, name: string) => {
      const error = nameError(name, latest.current, id);
      if (error) return error;
      commit(withName(latest.current, id, name));
      return null;
    },
    [commit],
  );

  const recordGame = useCallback(
    (id: string, subject: SubjectId, score: number) => {
      commit(withGame(latest.current, id, subject, score, Date.now()));
    },
    [commit],
  );

  const value = useMemo(
    () => ({ loaded, players, createPlayer, renamePlayer, recordGame }),
    [loaded, players, createPlayer, renamePlayer, recordGame],
  );
  return <PlayersContext value={value}>{children}</PlayersContext>;
}

export function usePlayers(): PlayersValue {
  const value = use(PlayersContext);
  if (!value) throw new Error('usePlayers must be used inside PlayersProvider');
  return value;
}
