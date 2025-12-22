import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import Link from 'next/link';
import { ClerkProvider, SignedIn, SignedOut, UserButton, SignInButton } from '@clerk/nextjs';
import { AuthProvider } from '@/components/AuthProvider';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Geekd - Your Coffee Journal',
  description: 'A thoughtful space to log and savor your coffee moments',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
        <body className="bg-[var(--bone)] text-[var(--espresso)] font-[family-name:var(--font-sans)] min-h-screen">
          {/* Subtle texture overlay */}
          <div className="fixed inset-0 pointer-events-none opacity-[0.015] z-50"
               style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")' }}
          />

          {/* Navigation */}
          <nav className="border-b border-[var(--taupe)]/30 bg-[var(--bone)]/90 backdrop-blur-sm sticky top-0 z-40">
            <div className="max-w-5xl mx-auto px-6 lg:px-8">
              <div className="flex items-center justify-between h-20">
                {/* Logo */}
                <Link
                  href="/"
                  className="font-[family-name:var(--font-serif)] text-2xl tracking-wide text-[var(--coffee)] hover:text-[var(--espresso)] transition-colors duration-300"
                >
                  Geekd
                </Link>

                {/* Nav Links */}
                <div className="flex items-center gap-6 md:gap-10">
                  <NavLink href="/">Journal</NavLink>
                  <NavLink href="/history">Archive</NavLink>
                  <NavLink href="/stats">Insights</NavLink>
                  <NavLink href="/map">Map</NavLink>

                  {/* Auth */}
                  <SignedIn>
                    <UserButton
                      appearance={{
                        elements: {
                          avatarBox: 'w-8 h-8 border border-[var(--taupe)]/30',
                        },
                      }}
                    />
                  </SignedIn>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button className="text-sm tracking-[0.1em] uppercase text-[var(--mocha)] hover:text-[var(--espresso)] transition-colors duration-300 py-2">
                        Sign In
                      </button>
                    </SignInButton>
                  </SignedOut>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content */}
          <AuthProvider>
            <main className="max-w-5xl mx-auto px-6 lg:px-8 py-12 md:py-16">
              {children}
            </main>
          </AuthProvider>

          {/* Footer */}
          <footer className="border-t border-[var(--taupe)]/20 mt-auto">
            <div className="max-w-5xl mx-auto px-6 lg:px-8 py-8">
              <p className="text-center text-sm text-[var(--latte)] tracking-wide">
                Savor every sip
              </p>
            </div>
          </footer>
        </body>
      </html>
    </ClerkProvider>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="relative text-sm tracking-[0.1em] uppercase text-[var(--mocha)] hover:text-[var(--espresso)] transition-colors duration-300 py-2 group"
    >
      {children}
      <span className="absolute bottom-0 left-0 w-0 h-px bg-[var(--terracotta)] transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}
