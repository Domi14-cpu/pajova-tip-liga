"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const navigation = [
  { name: "Domů", href: "/" },
  { name: "Tipovat", href: "/matches" },
  { name: "Žebříček", href: "/leaderboard" },
  { name: "Pravidla", href: "/#jak-to-funguje" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser);

      if (currentUser) {
        const { data: adminData } = await supabase
          .from("admins")
          .select("user_id")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        setIsAdmin(Boolean(adminData));
      } else {
        setIsAdmin(false);
      }

      setLoadingUser(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;

        setUser(currentUser);

        if (currentUser) {
          const { data: adminData } = await supabase
            .from("admins")
            .select("user_id")
            .eq("user_id", currentUser.id)
            .maybeSingle();

          setIsAdmin(Boolean(adminData));
        } else {
          setIsAdmin(false);
        }

        setLoadingUser(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    setLoggingOut(true);

    await supabase.auth.signOut();

    setMobileMenuOpen(false);
    router.push("/");
    router.refresh();

    setLoggingOut(false);
  }

  function isActive(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    if (href.startsWith("/#")) {
      return false;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const nickname =
    user?.user_metadata?.nickname ||
    user?.email?.split("@")[0] ||
    "Tipér";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-2xl">
      <div className="mx-auto flex min-h-[84px] max-w-7xl items-center justify-between px-4 sm:px-5">
        <Link
          href="/"
          aria-label="Přejít na hlavní stránku"
          className="group flex shrink-0 items-center"
        >
          <Image
            src="/images/logo-pajova-tip-liga.png"
            alt="Pájova Tip Liga"
            width={180}
            height={180}
            priority
            className="h-14 w-auto object-contain transition duration-300 group-hover:scale-[1.03] sm:h-16"
          />
        </Link>

        <nav className="hidden items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.035] p-1.5 lg:flex">
          {navigation.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
                  active
                    ? "bg-amber-400 text-black shadow-lg shadow-amber-400/10"
                    : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {item.name}
              </Link>
            );
          })}

          {isAdmin && (
            <Link
              href="/admin"
              className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${
                pathname.startsWith("/admin")
                  ? "bg-amber-400 text-black shadow-lg shadow-amber-400/10"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              Administrace
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {loadingUser ? (
            <div className="h-11 w-36 animate-pulse rounded-xl bg-white/10" />
          ) : user ? (
            <>
              <Link
                href="/profile"
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition ${
                  pathname.startsWith("/profile")
                    ? "border-amber-400/60 bg-amber-400/10"
                    : "border-white/10 bg-white/[0.035] hover:border-amber-400/40"
                }`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400 font-black text-black">
                  {nickname.charAt(0).toUpperCase()}
                </span>

                <span className="max-w-32 truncate text-sm font-black text-white">
                  {nickname}
                </span>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loggingOut ? "Odhlášení…" : "Odhlásit"}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-300 transition hover:border-amber-400/40 hover:text-white"
              >
                Přihlásit
              </Link>

              <Link
                href="/register"
                className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-black shadow-lg shadow-amber-400/10 transition hover:-translate-y-0.5 hover:bg-amber-300"
              >
                Registrovat
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          aria-label={
            mobileMenuOpen ? "Zavřít navigaci" : "Otevřít navigaci"
          }
          aria-expanded={mobileMenuOpen}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] text-white transition hover:border-amber-400/40 lg:hidden"
        >
          <span className="relative h-5 w-5">
            <span
              className={`absolute left-0 top-1 h-0.5 w-5 rounded bg-current transition ${
                mobileMenuOpen
                  ? "translate-y-1.5 rotate-45"
                  : ""
              }`}
            />

            <span
              className={`absolute left-0 top-2.5 h-0.5 w-5 rounded bg-current transition ${
                mobileMenuOpen ? "opacity-0" : ""
              }`}
            />

            <span
              className={`absolute left-0 top-4 h-0.5 w-5 rounded bg-current transition ${
                mobileMenuOpen
                  ? "-translate-y-1.5 -rotate-45"
                  : ""
              }`}
            />
          </span>
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-white/10 bg-black/95 px-4 pb-5 pt-4 backdrop-blur-2xl lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-2">
            {navigation.map((item) => {
              const active = isActive(item.href);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`rounded-xl px-4 py-3.5 text-sm font-black transition ${
                    active
                      ? "bg-amber-400 text-black"
                      : "border border-white/10 bg-white/[0.035] text-zinc-300 hover:border-amber-400/40"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className={`rounded-xl px-4 py-3.5 text-sm font-black transition ${
                  pathname.startsWith("/admin")
                    ? "bg-amber-400 text-black"
                    : "border border-amber-400/20 bg-amber-400/10 text-amber-300"
                }`}
              >
                ⚙️ Administrace
              </Link>
            )}
          </nav>

          <div className="mx-auto mt-4 max-w-7xl border-t border-white/10 pt-4">
            {loadingUser ? (
              <div className="h-12 animate-pulse rounded-xl bg-white/10" />
            ) : user ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-400 font-black text-black">
                    {nickname.charAt(0).toUpperCase()}
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      Přihlášený tipér
                    </p>

                    <p className="truncate font-black text-white">
                      {nickname}
                    </p>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  {loggingOut ? "Odhlášení…" : "Odhlásit se"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-black text-white"
                >
                  Přihlásit se
                </Link>

                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl bg-amber-400 px-4 py-3 text-center text-sm font-black text-black"
                >
                  Registrovat
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}