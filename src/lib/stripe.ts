import Stripe from 'stripe';

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia',
      typescript: true,
    });
  }
  return stripeInstance;
}

// For backwards compatibility - but will throw if used without env var
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe];
  }
});

export const DONATION_PRODUCTS = {
  supporter: {
    name: 'Don Supporter',
    description: 'Un cafe pour l\'equipe Flow Dating',
    amount: 500, // 5€ en centimes
  },
  fan: {
    name: 'Don Fan',
    description: 'Aide au developpement de Flow Dating',
    amount: 1000, // 10€
  },
  champion: {
    name: 'Don Champion',
    description: 'Soutien significatif a Flow Dating',
    amount: 2500, // 25€
  },
  hero: {
    name: 'Don Hero',
    description: 'Impact majeur sur Flow Dating',
    amount: 5000, // 50€
  },
  legend: {
    name: 'Don Legend',
    description: 'Contribution exceptionnelle a Flow Dating',
    amount: 10000, // 100€
  },
} as const;

export type DonationTier = keyof typeof DONATION_PRODUCTS;
