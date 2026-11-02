"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { PublicContainer } from "./public-container";
import { cn } from "@/lib/utils";

interface PublicNavbarProps {
  isVisible?: boolean;
}

export function PublicNavbar({ isVisible = true }: PublicNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        isVisible ? "translate-y-0" : "-translate-y-full",
        isScrolled 
          ? "py-3 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-black/5 dark:border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.02)]" 
          : "py-5 bg-transparent border-transparent"
      )}
    >
      <PublicContainer className="max-w-[1440px]">
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Image
              src="/logovar6.svg"
              alt="Kaizen Admin"
              width={56}
              height={56}
              className="h-12 w-auto relative z-10 group-hover:scale-110 transition-transform duration-500"
              priority
            />
          </div>
          <span className="text-xl font-bold tracking-tight hidden sm:inline text-black dark:text-white">
            Kaizen Admin
          </span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-2 text-[13px] font-semibold text-gray-500 dark:text-gray-400 flex-1 justify-center">
          {/* <Link href="/features" className="hover:text-black dark:hover:text-white px-4 py-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300">
            Features
          </Link> */}
          {/* <Link href="/about" className="hover:text-black dark:hover:text-white px-4 py-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300">
            About
          </Link> */}
          <Link href="/contact" className="hover:text-black dark:hover:text-white px-4 py-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all duration-300">
            Support
          </Link>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <Link href="/login" className="text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors">
            Sign in
          </Link>
        </div>
      </PublicContainer>
    </nav>
  );
}

