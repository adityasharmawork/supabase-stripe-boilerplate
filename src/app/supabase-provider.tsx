// app/supabase-provider.tsx
"use client";

import { useState } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createClient } from '@/lib/supabase/client'; // Adjust path if needed

// This component wraps our application and provides the Supabase session
export default function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabaseClient] = useState(() => createClient());

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  );
}