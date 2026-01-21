'use client';

import { useEffect, useState, useCallback } from 'react';

// Hardcoded Supabase configuration - shared across all apps
const SUPABASE_URL = 'https://api.srv936332.hstgr.cloud';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
const APP_SLUG = 'knit-community-hub';

interface User {
  email?: string;
  id: string;
}

interface SupabaseClient {
  auth: {
    signInWithOAuth: (options: { provider: string; options?: { redirectTo: string } }) => Promise<{ error: Error | null }>;
    signOut: () => Promise<{ error: Error | null }>;
    getSession: () => Promise<{ data: { session: { user: User } | null } }>;
    onAuthStateChange: (callback: (event: string, session: { user: User } | null) => void) => { data: { subscription: { unsubscribe: () => void } } };
  };
  from: (table: string) => {
    upsert: (data: Record<string, unknown>, options?: { onConflict: string }) => Promise<{ error: Error | null }>;
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => {
          single: () => Promise<{ data: Record<string, unknown> | null; error: Error | null }>;
        };
      };
    };
  };
}

declare global {
  interface Window {
    supabase: {
      createClient: (url: string, key: string) => SupabaseClient;
    };
  }
}

export default function GoogleAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);

  const trackUserLogin = useCallback(async (client: SupabaseClient, userEmail: string, userId: string) => {
    try {
      // Check if user+app combo exists
      const { data: existing, error: selectError } = await client
        .from('user_tracking')
        .select('login_cnt')
        .eq('user_id', userId)
        .eq('app', APP_SLUG)
        .single();

      if (selectError && !selectError.message.includes('No rows found') && !selectError.message.includes('JSON object requested')) {
        console.error('Error checking user tracking:', selectError);
      }

      const now = new Date().toISOString();

      if (existing) {
        // User exists - increment login count and update timestamp
        await client.from('user_tracking').upsert(
          {
            user_id: userId,
            app: APP_SLUG,
            email: userEmail,
            login_cnt: (existing.login_cnt as number || 0) + 1,
            last_login_ts: now,
          },
          { onConflict: 'user_id,app' }
        );
      } else {
        // New user - insert with login_cnt = 1
        await client.from('user_tracking').upsert(
          {
            user_id: userId,
            app: APP_SLUG,
            email: userEmail,
            login_cnt: 1,
            last_login_ts: now,
            created_at: now,
          },
          { onConflict: 'user_id,app' }
        );
      }
    } catch (error) {
      console.error('Error tracking user login:', error);
    }
  }, []);

  useEffect(() => {
    // Load Supabase client via CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.async = true;
    script.onload = () => {
      const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      setSupabaseClient(client);

      // Check for existing session
      client.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
        }
        setLoading(false);
      });

      // Listen for auth changes
      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          trackUserLogin(client, session.user.email || '', session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [trackUserLogin]);

  const signInWithGoogle = async () => {
    if (!supabaseClient) return;

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : '',
      },
    });

    if (error) {
      console.error('Error signing in:', error);
    }
  };

  const signOut = async () => {
    if (!supabaseClient) return;

    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        Loading...
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
          {user.email}
        </span>
        <button
          onClick={signOut}
          className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={signInWithGoogle}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      Sign in with Google
    </button>
  );
}
