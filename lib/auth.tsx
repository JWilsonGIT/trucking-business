"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getUsers } from "./db/queries";
import { setActor } from "./db/session";
import type { User } from "./db/types";

const AUTH_KEY = "trucking.auth.userId";

interface AuthValue {
  user: User | null;
  users: User[];
  ready: boolean;
  login: (userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getUsers()
      .then((list) => {
        if (!alive) return;
        setUsers(list);
        const saved = window.localStorage.getItem(AUTH_KEY);
        if (saved && list.some((u) => u.id === saved)) {
          setUserId(saved);
          setActor(saved);
        }
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const login = useCallback((id: string) => {
    window.localStorage.setItem(AUTH_KEY, id);
    setActor(id);
    setUserId(id);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(AUTH_KEY);
    setActor(null);
    setUserId(null);
  }, []);

  const user = userId ? users.find((u) => u.id === userId) ?? null : null;

  return (
    <AuthContext.Provider value={{ user, users, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
