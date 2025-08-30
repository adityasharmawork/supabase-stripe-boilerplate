import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';

// Initialize Stripe client
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2025-08-27.basil',
});

// Get the webhook signing secret from environment variables
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('Stripe-Signature');
    const body = await req.text();

    // Verify the webhook signature
    const event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret, {tolerance: 25000});

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        
        // Prepare data for upsert
        const subscriptionData = {
          id: subscription.id,
          user_id: subscription.metadata.supabase_id,
          status: subscription.status,
          price_id: subscription.items.data[0].price.id,
          // Convert Unix timestamps to ISO 8601 strings
          current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
        };

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .upsert(subscriptionData);

        if (error) {
          console.error('Supabase DB error:', error);
          throw error;
        }
        
        console.log(`Subscription ${subscription.id} processed.`);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Return a success response
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('Webhook error:', err.message);
    // Return an error response
    return new Response(err.message, {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});