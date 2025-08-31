// src/lib/stripe/customer.ts
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

/**
 * Retrieves a Stripe customer ID for a given Supabase user.
 * If the user does not have a customer ID, it creates one in Stripe,
 * updates the user's profile in Supabase, and returns the new ID.
 * It also handles cases where the customer exists but is missing metadata.
 *
 * @param user - The Supabase user object.
 * @param profile - The user's profile from the Supabase 'profiles' table.
 * @returns The Stripe customer ID.
 */
export async function getOrCreateStripeCustomerId({
  user,
  profile,
}: {
  user: { id: string; email?: string };
  profile: { stripe_customer_id: string | null };
}): Promise<string> {
  // If the user's profile already has a Stripe customer ID, handle it
  if (profile.stripe_customer_id) {
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
    // If the customer is missing metadata, update them in Stripe
    if (!customer.metadata || !customer.metadata.supabase_id) {
      await stripe.customers.update(profile.stripe_customer_id, {
        metadata: { supabase_id: user.id },
      });
    }
    return profile.stripe_customer_id;
  }

  // If no customer ID exists, create a new customer in Stripe
  const customer = await stripe.customers.create({
    email: user.email!,
    metadata: { supabase_id: user.id },
  });

  // Update the user's profile in Supabase with the new customer ID
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', user.id);

  if (error) {
    throw new Error(`Failed to update profile for user ${user.id}: ${error.message}`);
  }

  return customer.id;
}