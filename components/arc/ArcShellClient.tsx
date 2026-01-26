"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { StorySelector } from "@/components/arc/StorySelector";
import { UserMenu } from "@/components/arc/UserMenu";

const nav = [
  { href: "/archive", label: "Archive", icon: "📚" },
  { href: "/episodes", label: "Episodes", icon: "📺" },
  { href: "/timeline", label: "Timeline", icon: "📅" },
  { href: "/relationships", label: "Relationships", icon: "🔗" },
  { href: "/continuity", label: "Continuity", icon: "⏱️" },
  { href: "/tags", label: "Tags", icon: "🏷️" },
  { href: "/map", label: "Map", icon: "🗺️" },
];

type ArcShellClientProps = {
  children: React.ReactNode;
  currentUser: any;
  currentStory: any;
  allStories: any[];
};

export function ArcShellClient({
  children,
  currentUser,
  currentStory,
  allStories,
}: ArcShellClientProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [children]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <Link 
        href="/" 
        className="mb-2 block group"
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div className="text-2xl font-bold tracking-tight text-foreground group-hover:text-foreground transition-colors">
          ARC
        </div>
        <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1.5 group-hover:text-accent transition-colors">
          Archive · Relationships · Continuity
        </div>
      </Link>

      {/* Story Selector */}
      <div className="mb-3">
        <StorySelector currentStory={currentStory} allStories={allStories} />
      </div>

      <Separator className="my-3 bg-border/50" />

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="nav-link flex items-center gap-3"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User Menu */}
      {currentUser && (
        <>
          <Separator className="my-3 bg-border/50" />
          <UserMenu user={currentUser} />
        </>
      )}
    </>
  );

  return (
    <div className="min-h-screen gradient-bg">
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-72 shrink-0 min-h-screen p-6 flex-col glass-strong sticky top-0 shadow-xl">
          <SidebarContent />
        </aside>

        {/* Mobile Header */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-40 glass-strong border-b border-border/50">
          <div className="flex items-center justify-between px-4 py-3 safe-area-inset-top">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-foreground">
                ARC
              </span>
            </Link>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 hover:bg-muted/50 rounded-lg transition-colors touch-manipulation"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`lg:hidden fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] z-50 glass-strong shadow-2xl transform transition-transform duration-300 ease-in-out ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-full overflow-y-auto p-6 flex flex-col">
            <SidebarContent />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 max-w-7xl mt-16 lg:mt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
