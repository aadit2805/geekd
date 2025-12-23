'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="font-[family-name:var(--font-serif)] text-5xl md:text-6xl lg:text-7xl text-[var(--coffee)] mb-6 leading-tight">
          Your Coffee Journey,
          <br />
          <span className="text-[var(--terracotta)]">Beautifully Logged</span>
        </h1>

        <p className="text-lg text-[var(--mocha)] max-w-xl mx-auto mb-10">
          A personal archive of your coffee experiences.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isLoaded && isSignedIn ? (
            <Link
              href="/journal"
              className="px-8 py-4 bg-[var(--coffee)] text-[var(--card)] rounded-lg font-medium tracking-wide hover:bg-[var(--espresso)] transition-colors"
            >
              Start Logging
            </Link>
          ) : (
            <>
              <Link
                href="/sign-up"
                className="px-8 py-4 bg-[var(--coffee)] text-[var(--card)] rounded-lg font-medium tracking-wide hover:bg-[var(--espresso)] transition-colors"
              >
                Get Started
              </Link>
              <Link
                href="/sign-in"
                className="px-8 py-4 border border-[var(--taupe)] text-[var(--coffee)] rounded-lg font-medium tracking-wide hover:bg-[var(--linen)] transition-colors"
              >
                Sign In
              </Link>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
