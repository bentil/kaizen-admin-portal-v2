import Image from "next/image";
import Link from "next/link";
import { PublicContainer } from "./public-container";
import { Github, Twitter, Linkedin } from "lucide-react";
import { CountdownTimer } from "../ui/countdown-timer";

export function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#2C31CD] text-white py-20 mt-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col items-center text-center">
          {/* Logo Section */}
          <Link href="/" className="mb-8 group">
            <div className="bg-white p-2 rounded-xl inline-block shadow-lg">
              <Image
                src="/logovar6.svg"
                alt="Kaizen Admin"
                width={32}
                height={32}
                className="h-8 w-auto"
              />
            </div>
          </Link>

          {/* Tagline */}
          <h3 className="text-xl font-bold mb-4">Kaizen Admin</h3>
          <p className="text-white/70 text-sm max-w-md mb-12">
            The intelligent procurement platform for modern businesses.
            Simplify tracking, approvals, and vendor management.
          </p>

          {/* Store Section */}
          <div className="mb-16">
            <div className="inline-flex flex-col items-center p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/40 mb-4">Coming soon on mobile</span>
              <CountdownTimer targetDate={new Date("2026-04-03T23:59:59")} className="mb-6" />
              <div className="flex flex-row items-center gap-6">
                <div className="relative group/badge">
                  <Image
                    src="/app-store-badge.svg"
                    alt="Coming Soon on App Store"
                    width={135}
                    height={40}
                    className="h-10 w-auto opacity-30 grayscale brightness-200"
                  />
                </div>
                <div className="relative group/badge">
                  <Image
                    src="/play-store-badge.svg"
                    alt="Coming Soon on Google Play"
                    width={135}
                    height={40}
                    className="h-10 w-auto opacity-30 grayscale brightness-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Links */}
          <div className="w-full pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8 text-sm font-medium">
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-white/80">
              {/* <Link href="/about" className="hover:text-white transition-all underline-offset-4 hover:underline">About</Link> */}
              <Link href="/pricing" className="hover:text-white transition-all underline-offset-4 hover:underline">Pricing</Link>
              <Link href="/contact" className="hover:text-white transition-all underline-offset-4 hover:underline">Support</Link>
              <Link href="/privacy" className="hover:text-white transition-all underline-offset-4 hover:underline">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-all underline-offset-4 hover:underline">Terms</Link>
            </div>

            <div className="flex items-center gap-6">
              {/* <Link href="https://twitter.com" className="text-white/40 hover:text-white transition-colors">
                    <Twitter className="w-5 h-5" />
                </Link>
                <Link href="https://github.com" className="text-white/40 hover:text-white transition-colors">
                    <Github className="w-5 h-5" />
                </Link> */}
              <Link href="https://www.linkedin.com/company/lucid-array/" className="text-white/40 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </Link>
            </div>
          </div>

          <div className="mt-12 text-white/30 text-xs">
            © {currentYear} Kaizen Admin. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}




