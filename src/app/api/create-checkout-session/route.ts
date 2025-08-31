// // app/api/create-checkout-session/route.ts
// import { cookies } from 'next/headers';
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';
// import Stripe from 'stripe';
// import { createClient } from '../../../lib/supabase/server';
// import { supabaseAdmin } from '../../../lib/supabase/admin';

// // Initialize Stripe
// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
//   apiVersion: '2025-08-27.basil',
// });

// export async function POST(request: NextRequest) {
//   const cookieStore = await cookies();
//   const supabase = createClient(cookieStore);

//   try {
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { data: profile } = await supabase
//       .from('profiles')
//       .select('stripe_customer_id')
//       .eq('id', user.id)
//       .single();

//     if (!profile) {
//       return NextResponse.json({ error: 'Could not retrieve user profile.' }, { status: 500 });
//     }

//     let customerId = profile.stripe_customer_id;

//     // Logic to ensure a valid customerId exists
//     if (customerId) {
//       const customer = await stripe.customers.retrieve(customerId);
//       if (!customer.metadata || !customer.metadata.supabase_id) {
//         await stripe.customers.update(customerId, {
//           metadata: { supabase_id: user.id },
//         });
//       }
//     } else {
//       const customer = await stripe.customers.create({
//         email: user.email!,
//         metadata: { supabase_id: user.id },
//       });
//       customerId = customer.id;
//       await supabaseAdmin
//         .from('profiles')
//         .update({ stripe_customer_id: customerId })
//         .eq('id', user.id);
//     }

//     // --- This logic now runs for EVERYONE, not just new customers ---
//     const origin = request.nextUrl.origin;
//     const session = await stripe.checkout.sessions.create({
//       payment_method_types: ['card'],
//       customer: customerId,
//       line_items: [
//         {
//           price: process.env.STRIPE_PRICE_ID!,
//           quantity: 1,
//         },
//       ],
//       mode: 'subscription',
//       success_url: `${origin}/?success=true`,
//       cancel_url: `${origin}/?canceled=true`,
//     });

//     return NextResponse.json({ sessionId: session.id, url: session.url });

//   } catch (err: any) {
//     console.error(err);
//     return NextResponse.json({ error: { statusCode: 500, message: err.message } }, { status: 500 });
//   }
// }



















import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../lib/supabase/server';
import { getOrCreateStripeCustomerId } from '../../../lib/stripe/customer'; 

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Could not retrieve user profile.' }, { status: 500 });
    }

    const customerId = await getOrCreateStripeCustomerId({ user, profile });

    const origin = request.nextUrl.origin;
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/?success=true`,
      cancel_url: `${origin}/?canceled=true`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: { statusCode: 500, message: err.message } }, { status: 500 });
  }
}