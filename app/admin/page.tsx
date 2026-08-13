"use client";

import Link from "next/link";

const adminSections = [
  { title: "Zápasy", description: "Přidávání, úpravy, výsledky a mazání zápasů.", href: "/admin/matches", icon: "📅" },
  { title: "Sezóny", description: "Veřejné i zamknuté sezóny, přístupové kódy a členové.", href: "/admin/seasons", icon: "🗓️" },
  { title: "Týmy", description: "Kluby, reprezentace, loga a sporty.", href: "/admin/teams", icon: "🛡️" },
  { title: "Soutěže", description: "Ligy, poháry, EURO, mistrovství světa a další.", href: "/admin/competitions", icon: "🏆" },
  { title: "Uživatelé", description: "Profily hráčů, body a správa účtů.", href: "/admin/users", icon: "👥" },
  { title: "Tipy", description: "Přehled tipů a jejich případné ruční opravy.", href: "/admin/predictions", icon: "🎯" },
  { title: "Vyhodnocení", description: "Zadávání výsledků a automatický přepočet bodů.", href: "/admin/evaluation", icon: "📊" },
];

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-14 pb-28 lg:pb-14">
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-7 sm:p-10">
        <p className="font-bold uppercase tracking-[0.22em] text-amber-400">Pájova Tip Liga</p>
        <h1 className="mt-3 text-4xl font-black sm:text-5xl">Administrace</h1>
        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">Spravuj zápasy, sezóny, týmy, soutěže, uživatele, tipy a výsledky z jednoho místa.</p>
      </section>
      <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => (
          <Link key={section.href} href={section.href} className="group rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:border-amber-400/40 hover:bg-white/[0.055]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10 text-2xl">{section.icon}</div>
            <h2 className="mt-6 text-xl font-black transition group-hover:text-amber-400">{section.title}</h2>
            <p className="mt-3 leading-7 text-zinc-400">{section.description}</p>
            <p className="mt-5 text-sm font-bold text-amber-400">Otevřít →</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
