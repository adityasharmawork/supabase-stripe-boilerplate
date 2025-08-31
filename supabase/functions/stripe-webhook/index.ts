// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2025-08-27.basil',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('Stripe-Signature');
    if (!signature) {
      console.error('Missing Stripe signature header');
      return new Response(JSON.stringify({ error: 'missing signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.text();
    console.log('RAW BODY:', body);

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      { tolerance: 300 } 
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const tsToISOString = (ts: unknown): string | null => {
      if (ts == null) return null;
      const n = typeof ts === 'string' ? parseInt(ts, 10) : (typeof ts === 'number' ? ts : NaN);
      if (Number.isNaN(n)) return null;
      const ms = n > 1e12 ? n : n * 1000; 
      return new Date(ms).toISOString();
    };

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // timestamps
        const current_period_start_iso = tsToISOString(subscription.current_period_start);
        const current_period_end_iso = tsToISOString(subscription.current_period_end);

        // price id safe extraction
        const price_id = subscription.items?.data?.[0]?.price?.id ?? null;

        // try to get supabase user id from subscription metadata
        let supabaseUserId = subscription.metadata?.supabase_id ?? null;

        // if no supabase id in metadata, try to get it from the Stripe customer metadata
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : (subscription.customer as any)?.id ?? null;

        if (!supabaseUserId && customerId) {
          try {
            const customer = await stripe.customers.retrieve(customerId);
            supabaseUserId = (customer as any)?.metadata?.supabase_id ?? null;
          } catch (e) {
            console.warn('Could not retrieve customer from Stripe:', e);
          }
        }

        if (!supabaseUserId && customerId) {
          const { data: profileLookup, error: lookupErr } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .single();
          if (!lookupErr && profileLookup) {
            supabaseUserId = (profileLookup as any).id;
          }
        }

        const subscriptionData: any = {
          id: subscription.id,
          user_id: supabaseUserId, 
          status: subscription.status,
          price_id,
          current_period_start: current_period_start_iso,
          current_period_end: current_period_end_iso,
          cancel_at_period_end: subscription.cancel_at_period_end ?? false,
        };

        Object.keys(subscriptionData).forEach((k) => {
          if (subscriptionData[k] === undefined) subscriptionData[k] = null;
        });

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .upsert(subscriptionData, { onConflict: 'id' });

        if (error) throw error;

        console.log(`Subscription ${subscription.id} processed. user_id=${supabaseUserId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
