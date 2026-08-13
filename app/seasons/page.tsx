"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Season = {
  id: string;
  name: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_private: boolean;
  is_active: boolean;
  is_member: boolean;
};

function formatDate(value: string | null) {
  return value ? new Date(`${value}T12:00:00`).toLocaleDateString("cs-CZ") : null;
}

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [message, setMessage] = useState("");

  async function loadSeasons() {
    setLoading(true);
    const { data, error } = await supabase.rpc("list_available_seasons");
    if (error) setMessage(`Sezóny se nepodařilo načíst: ${error.message}`);
    else setSeasons((data as Season[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadSeasons(); }, []);

  async function openJoin(season: Season) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = "/login"; return; }
    setMessage("");
    setAccessCode("");
    setSelectedSeason(season);
  }

  async function handleJoin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSeason) return;
    setJoining(true); setMessage("");
    const { error } = await supabase.rpc("join_season_with_code", {
      p_season_id: selectedSeason.id,
      p_access_code: selectedSeason.is_private ? accessCode : null,
    });
    if (error) {
      setMessage(error.message);
    } else {
      setSelectedSeason(null);
      setAccessCode("");
      setMessage(`Do sezóny „${selectedSeason.name}“ ses úspěšně připojil.`);
      await loadSeasons();
    }
    setJoining(false);
  }

  return <main className="mx-auto min-h-screen w-full max-w-7xl px-5 py-14 pb-28 text-white lg:pb-14">
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-7 sm:p-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(251,191,36,0.14),transparent_38%)]" />
      <div className="relative"><p className="font-bold uppercase tracking-[0.22em] text-amber-400">Pájova Tip Liga</p><h1 className="mt-3 text-4xl font-black sm:text-6xl">Sezóny</h1><p className="mt-4 max-w-2xl leading-7 text-zinc-400">Vyber si veřejnou sezónu, nebo se pomocí kódu připoj k soukromé lize své party.</p></div>
    </section>
    {message && <p className="mt-6 rounded-xl border border-white/10 bg-black p-4 text-center text-sm font-bold text-zinc-300">{message}</p>}
    <section className="mt-8 grid gap-5 md:grid-cols-2">
      {loading ? <p className="text-zinc-400">Načítám sezóny…</p> : seasons.length === 0 ? <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-8 text-center text-zinc-400">Zatím není dostupná žádná sezóna.</div> : seasons.map((season) => {
        const dates = [formatDate(season.starts_at), formatDate(season.ends_at)].filter(Boolean).join(" – ");
        return <article key={season.id} className="flex flex-col rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-black text-amber-400">{season.is_private ? "🔒 Zamknutá sezóna" : "🌍 Veřejná sezóna"}</p><h2 className="mt-3 text-2xl font-black">{season.name}</h2></div>{season.is_member && <span className="shrink-0 rounded-full bg-green-500/10 px-3 py-1.5 text-xs font-black text-green-300">Připojeno</span>}</div><p className="mt-4 min-h-12 text-sm leading-6 text-zinc-400">{season.description || "Bez popisu."}</p>{dates && <p className="mt-4 text-sm font-bold text-zinc-500">📅 {dates}</p>}<div className="mt-7">{season.is_member || !season.is_private ? <Link href={`/leaderboard?season=${season.id}`} className="inline-flex w-full items-center justify-center rounded-xl bg-amber-400 px-5 py-3.5 font-black text-black transition hover:bg-amber-300">Zobrazit žebříček</Link> : <button type="button" onClick={() => openJoin(season)} className="w-full rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-3.5 font-black text-amber-300 transition hover:bg-amber-400 hover:text-black">Zadat kód a připojit se</button>}</div></article>;
      })}
    </section>
    {selectedSeason && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"><button type="button" aria-label="Zavřít" onClick={() => !joining && setSelectedSeason(null)} className="absolute inset-0" /><form onSubmit={handleJoin} className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#101010] p-6 shadow-2xl sm:p-8"><p className="font-bold uppercase tracking-[0.2em] text-amber-400">🔒 Zamknutá sezóna</p><h2 className="mt-3 text-2xl font-black">{selectedSeason.name}</h2><p className="mt-3 text-sm leading-6 text-zinc-400">Zadej kód, který ti předal administrátor sezóny.</p><label className="mt-6 block"><span className="mb-2 block text-sm font-bold">Přístupový kód</span><input autoFocus type="password" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400" /></label><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => setSelectedSeason(null)} disabled={joining} className="rounded-xl border border-white/10 px-5 py-3.5 font-black text-zinc-300">Zrušit</button><button type="submit" disabled={joining} className="rounded-xl bg-amber-400 px-5 py-3.5 font-black text-black disabled:opacity-50">{joining ? "Ověřuji kód…" : "Připojit se"}</button></div></form></div>}
  </main>;
}
