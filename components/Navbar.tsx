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
  const [profileNickname, setProfileNickname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  async function loadNavbarProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("nickname, avatar_url")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Profil v navigaci se nepodařilo načíst:", error);
      return;
    }

    setProfileNickname(data?.nickname ?? "");
    setAvatarUrl(data?.avatar_url ?? null);
  }

  useEffect(() => {
    async function checkAdmin(userId: string) {
      const { data } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      setIsAdmin(Boolean(data));
    }

    async function loadUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      setUser(currentUser);

      if (currentUser) {
        await Promise.all([
          checkAdmin(currentUser.id),
          loadNavbarProfile(currentUser.id),
        ]);
      } else {
        setIsAdmin(false);
        setProfileNickname("");
        setAvatarUrl(null);
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
          await Promise.all([
            checkAdmin(currentUser.id),
            loadNavbarProfile(currentUser.id),
          ]);
        } else {
          setIsAdmin(false);
          setProfileNickname("");
          setAvatarUrl(null);
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

  useEffect(() => {
    function refreshProfile() {
      if (user) {
        loadNavbarProfile(user.id);
      }
    }

    window.addEventListener("profile-updated", refreshProfile);

    return () => {
      window.removeEventListener("profile-updated", refreshProfile);
    };
  }, [user]);

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

  const mobileItems = [
    {
      name: "Domů",
      href: "/",
      icon: "⌂",
    },
    {
      name: "Tipovat",
      href: "/matches",
      icon: "⚽",
    },
    {
      name: "Žebříček",
      href: "/leaderboard",
      icon: "🏆",
    },
    {
      name: user ? "Profil" : "Přihlásit",
      href: user ? "/profile" : "/login",
      icon: "👤",
    },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-[68px] max-w-7xl items-center justify-between px-4 sm:min-h-[84px] sm:px-5">
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
              className="h-11 w-auto object-contain transition duration-300 group-hover:scale-[1.03] sm:h-16"
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
                    ? "bg-amber-400 text-black"
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
                  <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-amber-400 font-black text-black">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={nickname}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      nickname.charAt(0).toUpperCase()
                    )}
                  </span>

                  <span className="max-w-32 truncate text-sm font-black">
                    {nickname}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-300 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                >
                  {loggingOut ? "Odhlášení…" : "Odhlásit"}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm font-black text-zinc-300"
                >
                  Přihlásit
                </Link>

                <Link
                  href="/register"
                  className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-black"
                >
                  Registrovat
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen((current) => !current)
            }
            aria-label={
              mobileMenuOpen
                ? "Zavřít navigaci"
                : "Otevřít navigaci"
            }
            aria-expanded={mobileMenuOpen}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] lg:hidden"
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
            <div className="mx-auto grid max-w-7xl gap-3">
              <Link
                href="/#jak-to-funguje"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3.5 text-sm font-black text-zinc-300"
              >
                📖 Pravidla
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3.5 text-sm font-black text-amber-300"
                >
                  ⚙️ Administrace
                </Link>
              )}

              {user ? (
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3">
                    <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-amber-400 font-black text-black">
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={nickname}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        nickname.charAt(0).toUpperCase()
                      )}
                    </span>

                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Přihlášený tipér
                      </p>

                      <p className="truncate font-black">
                        {nickname}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3.5 font-black text-red-300"
                  >
                    {loggingOut
                      ? "Odhlášení…"
                      : "Odhlásit se"}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    onClick={() =>
                      setMobileMenuOpen(false)
                    }
                    className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-black"
                  >
                    Přihlásit
                  </Link>

                  <Link
                    href="/register"
                    onClick={() =>
                      setMobileMenuOpen(false)
                    }
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

      {/* MOBILNÍ SPODNÍ NAVIGACE */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/95 px-2 pt-2 backdrop-blur-2xl lg:hidden"
        style={{
          paddingBottom:
            "max(8px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {mobileItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(
                    `${item.href}/`
                  );

            return (
              <Link
                key={item.name}
                href={item.href}
                className="group flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-xl"
              >
                <span
                  className={`flex h-8 w-10 items-center justify-center rounded-xl text-lg transition ${
                    active
                      ? "bg-amber-400 text-black"
                      : "text-zinc-400"
                  }`}
                >
                  {item.icon}
                </span>

                <span
                  className={`text-[10px] font-black transition ${
                    active
                      ? "text-amber-400"
                      : "text-zinc-500"
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
