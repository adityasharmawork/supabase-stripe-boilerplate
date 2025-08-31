import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});


export async function getOrCreateStripeCustomerId({
  user,
  profile,
}: {
  user: { id: string; email?: string };
  profile: { stripe_customer_id: string | null };
}): Promise<string> {
  if (profile.stripe_customer_id) {
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
    if (!customer.metadata || !customer.metadata.supabase_id) {
      await stripe.customers.update(profile.stripe_customer_id, {
        metadata: { supabase_id: user.id },
      });
    }
    return profile.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: user.email!,
    metadata: { supabase_id: user.id },
  });

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', user.id);

  if (error) {
    throw new Error(`Failed to update profile for user ${user.id}: ${error.message}`);
  }

  return customer.id;
}