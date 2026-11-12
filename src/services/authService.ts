import { User as SupabaseUser } from '@supabase/supabase-js';
import { dexieDB } from '../db/dexieDB';
import { supabase as sharedSupabaseClient } from '../lib/supabase';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isGuest?: boolean;
  createdAt: string;
}

interface StoredVaultUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  avatarUrl?: string;
  createdAt: string;
}

const VAULT_USERS_KEY = 'aura_auth_users_vault_v1';
const VAULT_SESSION_KEY = 'aura_auth_active_session_v1';

const supabaseClient = sharedSupabaseClient;

/**
 * Hash password locally with SHA-256 for secure client-side vault storage
 */
async function hashPassword(plain: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(plain));
      const hashArray = Array.from(new Uint8Array(buffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {}
  }
  // Simple fallback hash if crypto.subtle is unavailable
  let hash = 0;
  for (let i = 0; i < plain.length; i++) {
    hash = (hash << 5) - hash + plain.charCodeAt(i);
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}`;
}

class AuthService {
  private static instance: AuthService;
  private currentUser: AuthUser | null = null;
  private listeners: Set<(user: AuthUser | null) => void> = new Set();
  private initialized = false;

  private constructor() {
    this.restoreSessionSync();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Synchronous immediate session restoration from persistent storage
   */
  private restoreSessionSync(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(VAULT_SESSION_KEY);
      if (raw) {
        this.currentUser = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[AuthService] Error restoring session:', e);
    }
  }

  /**
   * Initialize and synchronize with Supabase (if configured)
   */
  public async init(): Promise<AuthUser | null> {
    if (this.initialized) return this.currentUser;
    this.initialized = true;

    if (supabaseClient) {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session?.user) {
          this.currentUser = this.mapSupabaseUser(session.user);
          this.saveSession(this.currentUser);
        }

        supabaseClient.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            this.currentUser = this.mapSupabaseUser(session.user);
            this.saveSession(this.currentUser);
          } else {
            // Keep local session if Supabase logged out but local is guest/vault
            if (this.currentUser && !this.currentUser.id.startsWith('sp_')) {
              return;
            }
            this.currentUser = null;
            this.clearSession();
          }
          this.notifyListeners();
        });
      } catch (err) {
        console.warn('[AuthService] Supabase session check error, using local vault:', err);
      }
    }

    // If still no user, ensure local session is checked
    if (!this.currentUser) {
      this.restoreSessionSync();
    }

    // Check IndexedDB backup if localStorage is empty or cleared
    if (!this.currentUser) {
      try {
        const idbSession = await dexieDB.settings.get(VAULT_SESSION_KEY);
        if (idbSession && idbSession.value) {
          const restoredUser = idbSession.value as AuthUser;
          this.currentUser = restoredUser;
          this.saveSession(restoredUser);
        }
      } catch {}
    }

    // Synchronize user accounts list between LocalStorage and IndexedDB
    try {
      const localUsers = this.getVaultUsers();
      if (localUsers.length === 0) {
        const idbUsers = await dexieDB.settings.get(VAULT_USERS_KEY);
        if (idbUsers && idbUsers.value && Array.isArray(idbUsers.value)) {
          this.saveVaultUsers(idbUsers.value);
        }
      } else {
        dexieDB.settings.put({ key: VAULT_USERS_KEY, value: localUsers }).catch(() => {});
      }
    } catch {}

    return this.currentUser;
  }

  public getCurrentUser(): AuthUser | null {
    if (!this.currentUser) {
      this.restoreSessionSync();
    }
    return this.currentUser;
  }

  /**
   * Sign In with Email or Username and Password
   */
  public async signIn(emailOrUsername: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    const cleanId = emailOrUsername.trim().toLowerCase();
    if (!cleanId || !password) {
      return { user: null, error: 'يرجى إدخال البريد الإلكتروني أو اسم المستخدم وكلمة المرور' };
    }

    // 1. Try Supabase Auth first if available
    if (supabaseClient && cleanId.includes('@')) {
      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: cleanId,
          password,
        });

        if (!error && data.user) {
          const user = this.mapSupabaseUser(data.user);
          this.setCurrentUser(user);
          return { user, error: null };
        }
      } catch (e: any) {
        console.warn('[AuthService] Supabase sign-in warning:', e);
      }
    }

    // 2. Local Vault Fallback verification
    try {
      const users = this.getVaultUsers();
      const pwdHash = await hashPassword(password);

      const found = users.find(
        (u) =>
          (u.email.toLowerCase() === cleanId || u.name.toLowerCase() === cleanId) &&
          u.passwordHash === pwdHash
      );

      if (!found) {
        return { user: null, error: 'بيانات الدخول غير صحيحة، يرجى التأكد من اسم المستخدم وكلمة المرور' };
      }

      const user: AuthUser = {
        id: found.id,
        email: found.email,
        name: found.name,
        avatarUrl: found.avatarUrl,
        createdAt: found.createdAt,
      };

      this.setCurrentUser(user);
      return { user, error: null };
    } catch (err: any) {
      return { user: null, error: err.message || 'حدث خطأ أثناء تسجيل الدخول' };
    }
  }

  /**
   * Create new account (Sign Up)
   */
  public async signUp(params: {
    email: string;
    password: string;
    name: string;
  }): Promise<{ user: AuthUser | null; error: string | null }> {
    const { email, password, name } = params;
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (!cleanEmail || !password || !cleanName) {
      return { user: null, error: 'جميع الحقول مطلوبة لإنشاء الحساب' };
    }

    if (password.length < 6) {
      return { user: null, error: 'يجب أن تتكون كلمة المرور من 6 خانات على الأقل' };
    }

    // 1. Try Supabase Auth if available
    if (supabaseClient && cleanEmail.includes('@')) {
      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { name: cleanName },
          },
        });

        if (!error && data.user) {
          const user = this.mapSupabaseUser(data.user, cleanName);
          this.setCurrentUser(user);
          return { user, error: null };
        } else if (error) {
          console.warn('[AuthService] Supabase signup error, falling back to vault:', error.message);
        }
      } catch (e: any) {
        console.warn('[AuthService] Supabase signup exception:', e);
      }
    }

    // 2. Local Vault Registration
    try {
      const users = this.getVaultUsers();
      const existing = users.find(
        (u) => u.email.toLowerCase() === cleanEmail || u.name.toLowerCase() === cleanName.toLowerCase()
      );

      if (existing) {
        return { user: null, error: 'البريد الإلكتروني أو اسم المستخدم مسجل مسبقاً' };
      }

      const pwdHash = await hashPassword(password);
      const newId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newUserRecord: StoredVaultUser = {
        id: newId,
        email: cleanEmail,
        name: cleanName,
        passwordHash: pwdHash,
        createdAt: new Date().toISOString(),
      };

      users.push(newUserRecord);
      this.saveVaultUsers(users);

      const user: AuthUser = {
        id: newUserRecord.id,
        email: newUserRecord.email,
        name: newUserRecord.name,
        createdAt: newUserRecord.createdAt,
      };

      this.setCurrentUser(user);
      return { user, error: null };
    } catch (err: any) {
      return { user: null, error: err.message || 'حدث خطأ أثناء إنشاء الحساب' };
    }
  }

  /**
   * Guest instant login
   */
  public continueAsGuest(): AuthUser {
    const guestUser: AuthUser = {
      id: 'guest_user',
      email: 'guest@aurawav.app',
      name: 'ضيف AURA',
      isGuest: true,
      createdAt: new Date().toISOString(),
    };
    this.setCurrentUser(guestUser);
    return guestUser;
  }

  /**
   * Sign Out
   */
  public async signOut(): Promise<void> {
    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch {}
    }
    this.currentUser = null;
    this.clearSession();
    this.notifyListeners();
  }

  public onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.currentUser);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private setCurrentUser(user: AuthUser): void {
    this.currentUser = user;
    this.saveSession(user);
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.currentUser);
      } catch (e) {
        console.error('[AuthService] Listener error:', e);
      }
    }
  }

  private saveSession(user: AuthUser): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(VAULT_SESSION_KEY, JSON.stringify(user));
    } catch {}
    try {
      dexieDB.settings.put({ key: VAULT_SESSION_KEY, value: user }).catch(() => {});
    } catch {}
  }

  private clearSession(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(VAULT_SESSION_KEY);
    } catch {}
    try {
      dexieDB.settings.delete(VAULT_SESSION_KEY).catch(() => {});
    } catch {}
  }

  private getVaultUsers(): StoredVaultUser[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(VAULT_USERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveVaultUsers(users: StoredVaultUser[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(VAULT_USERS_KEY, JSON.stringify(users));
    } catch {}
    try {
      dexieDB.settings.put({ key: VAULT_USERS_KEY, value: users }).catch(() => {});
    } catch {}
  }

  public isOwnerAuthenticated(): boolean {
    const user = this.getCurrentUser();
    if (!user || user.isGuest) return false;
    return true;
  }

  private mapSupabaseUser(user: SupabaseUser, fallbackName?: string): AuthUser {
    const meta = user.user_metadata || {};
    return {
      id: user.id, // Raw UUID for Supabase RLS and DB compatibility
      email: user.email || '',
      name: meta.name || meta.full_name || fallbackName || user.email?.split('@')[0] || 'User',
      avatarUrl: meta.avatar_url || meta.picture,
      createdAt: user.created_at || new Date().toISOString(),
    };
  }
}

export const authService = AuthService.getInstance();
