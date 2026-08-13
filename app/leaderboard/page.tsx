"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Season = { id: string; name: string; is_private: boolean; is_active: boolean; is_member: boolean };
type Player = { id: string; nickname: string; total_points: number; exact_predictions: number; avatar_url: string | null };

export default function LeaderboardPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSeasons() {
      const { data, error } = await supabase.rpc("list_available_seasons");
      if (error) { setMessage(`Sezóny se nepodařilo načíst: ${error.message}`); setLoading(false); return; }
      const loaded = (data as Season[] | null) ?? [];
      setSeasons(loaded);
      setSeasonId(loaded[0]?.id ?? "");
    }
    loadSeasons();
  }, []);

  useEffect(() => {
    async function loadLeaderboard() {
      if (!seasonId) { setPlayers([]); setLoading(false); return; }
      setLoading(true); setMessage("");
      const { data, error } = await supabase.rpc("get_season_leaderboard", { p_season_id: seasonId });
      if (error) setMessage(`Žebříček se nepodařilo načíst: ${error.message}`);
      else setPlayers((data as Player[] | null) ?? []);
      setLoading(false);
    }
    loadLeaderboard();
  }, [seasonId]);

  const currentSeason = seasons.find((season) => season.id === seasonId);
  const medal = (position: number) => position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : `${position}.`;

  return <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-14 pb-28 lg:pb-14">
    <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-7 sm:p-10">
      <p className="font-bold uppercase tracking-[0.22em] text-amber-400">Pájova Tip Liga</p>
      <h1 className="mt-3 text-4xl font-black sm:text-6xl">Žebříček tipérů</h1>
      <p className="mt-4 max-w-2xl leading-7 text-zinc-400">Pořadí je počítané jen z tipů v právě vybrané sezóně.</p>
      <label className="mt-7 block max-w-xl"><span className="mb-2 block text-sm font-bold">Sezóna</span><select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 font-black outline-none focus:border-amber-400">{seasons.map((season) => <option key={season.id} value={season.id}>{season.is_private ? "🔒 " : "🌍 "}{season.name}</option>)}</select></label>
      {currentSeason?.is_private && <p className="mt-4 text-sm font-bold text-amber-300">🔒 Zobrazuješ zamknutou sezónu, do které máš přístup.</p>}
    </section>
    <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035]">
      {loading ? <p className="p-8 text-center text-zinc-400">Načítám žebříček…</p> : message ? <p className="m-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">{message}</p> : players.length === 0 ? <p className="p-8 text-center text-zinc-400">V této sezóně zatím nikdo netipoval.</p> : players.map((player, index) => <Link key={player.id} href={`/profile/${player.id}`} className="group grid grid-cols-[52px_1fr_auto] items-center gap-3 border-b border-white/10 px-4 py-5 transition last:border-0 hover:bg-white/[0.05] sm:grid-cols-[90px_1fr_150px_120px_40px] sm:px-5"><span className={index < 3 ? "text-2xl font-black" : "font-black text-zinc-500"}>{medal(index + 1)}</span><div className="flex min-w-0 items-center gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-400 font-black text-black">{player.avatar_url ? <img src={player.avatar_url} alt={player.nickname} className="h-full w-full object-cover" /> : player.nickname.charAt(0).toUpperCase()}</span><span className="truncate font-black group-hover:text-amber-400">{player.nickname}</span></div><span className="hidden text-center font-bold text-zinc-400 sm:block">{player.exact_predictions}</span><div className="text-right"><span className="text-xl font-black text-amber-400">{player.total_points}</span><p className="text-[10px] font-bold uppercase text-zinc-600 sm:hidden">bodů</p></div><ChevronRight size={18} className="hidden text-zinc-600 sm:block" /></Link>)}</section>
  </main>;
}
