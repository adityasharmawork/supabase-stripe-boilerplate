// app/page.tsx
"use client";

import React, { useCallback } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

export default function Home() {
  const supabaseClient = useSupabaseClient();
  const user = useUser();

  const handleSubscribe = useCallback(async () => {
    if (!user) {
      alert("You must be logged in to subscribe.");
      return;
    }
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
    });
    const { url } = await response.json();
    if (url) {
      window.location.href = url;
    }
  }, [user]);

  // If the user is not logged in, show the Auth UI
  if (!user) {
    return (
      <div style={{ maxWidth: '420px', margin: '96px auto' }}>
        <Auth
          supabaseClient={supabaseClient}
          appearance={{ theme: ThemeSupa }}
          providers={['google']} // Optional: add social providers
        />
      </div>
    );
  }

  // If the user is logged in, show the main content
  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Welcome, {user.email}!</h1>
      <button onClick={handleSubscribe} style={{ fontSize: '1.2rem', padding: '10px 20px', marginRight: '10px' }}>
        Subscribe to Pro Plan
      </button>
      <button onClick={() => supabaseClient.auth.signOut()} style={{ fontSize: '1.2rem', padding: '10px 20px' }}>
        Sign Out
      </button>
    </div>
  );
}