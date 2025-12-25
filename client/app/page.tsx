'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl text-coffee mb-6 leading-tight">
          Your Coffee Journey,
          <br />
          <span className="text-terracotta">Beautifully Logged</span>
        </h1>

        <p className="text-lg text-mocha max-w-xl mx-auto mb-10">
          A personal archive of your coffee experiences.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isLoaded && isSignedIn ? (
            <Button asChild size="lg" className="bg-coffee hover:bg-espresso text-white">
              <Link href="/journal">Start Logging</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="bg-coffee hover:bg-espresso text-white">
                <Link href="/sign-up">Get Started</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-taupe text-coffee hover:bg-linen">
                <Link href="/sign-in">Sign In</Link>
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
