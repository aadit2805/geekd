'use client';

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex justify-center py-12">
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary: 'bg-[var(--terracotta)] hover:bg-[var(--terracotta-dark)]',
            card: 'bg-white border border-[var(--taupe)]/20 shadow-sm',
            headerTitle: 'font-[family-name:var(--font-serif)] text-[var(--coffee)]',
            headerSubtitle: 'text-[var(--mocha)]',
            socialButtonsBlockButton: 'border-[var(--taupe)]/30 hover:bg-[var(--linen)]',
            formFieldInput: 'border-[var(--taupe)]/30 focus:border-[var(--terracotta)] focus:ring-[var(--terracotta)]',
            footerActionLink: 'text-[var(--terracotta)] hover:text-[var(--terracotta-dark)]',
          },
        }}
      />
    </div>
  );
}
