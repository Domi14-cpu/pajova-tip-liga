"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  nickname: string;
  total_points: number;
  exact_predictions: number;
  avatar_url: string | null;
};

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadLeaderboard() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nickname, total_points, exact_predictions, avatar_url")
        .order("total_points", { ascending: false })
        .order("exact_predictions", { ascending: false });

      if (error) {
        setMessage(`Žebříček se nepodařilo načíst: ${error.message}`);
        setLoading(false);
        return;
      }

      setPlayers((data as Player[] | null) ?? []);
      setLoading(false);
    }

    loadLeaderboard();
  }, []);

  function getMedal(position: number) {
    if (position === 1) return "🥇";
    if (position === 2) return "🥈";
    if (position === 3) return "🥉";
    return `${position}.`;
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-14">
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-7 sm:p-10">
        <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
          Pájova Tip Liga
        </p>

        <h1 className="mt-3 text-4xl font-black sm:text-6xl">
          Žebříček tipérů
        </h1>

        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Pořadí se automaticky aktualizuje po vyhodnocení každého zápasu.
          Kliknutím na tipéra si zobrazíš jeho veřejný profil.
        </p>
      </section>

      <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035]">
        <div className="hidden grid-cols-[90px_1fr_150px_120px_40px] border-b border-white/10 px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 sm:grid">
          <span>Pořadí</span>
          <span>Tipér</span>
          <span className="text-center">Přesné tipy</span>
          <span className="text-right">Body</span>
          <span />
        </div>

        {loading ? (
          <p className="p-8 text-center text-zinc-400">Načítám žebříček…</p>
        ) : message ? (
          <p className="m-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {message}
          </p>
        ) : players.length === 0 ? (
          <p className="p-8 text-center text-zinc-400">
            V žebříčku zatím nikdo není.
          </p>
        ) : (
          players.map((player, index) => {
            const position = index + 1;
            const nickname = player.nickname || "Tipér";

            return (
              <Link
                key={player.id}
                href={`/profile/${player.id}`}
                className="group grid grid-cols-[52px_1fr_auto] items-center gap-3 border-b border-white/10 px-4 py-5 transition last:border-0 hover:bg-white/[0.05] sm:grid-cols-[90px_1fr_150px_120px_40px] sm:px-5"
              >
                <span
                  className={
                    position <= 3
                      ? "text-2xl font-black"
                      : "font-black text-zinc-500"
                  }
                >
                  {getMedal(position)}
                </span>

                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-400 font-black text-black">
                    {player.avatar_url ? (
                      <img
                        src={player.avatar_url}
                        alt={nickname}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      nickname.charAt(0).toUpperCase()
                    )}
                  </div>

                  <span className="truncate font-black transition group-hover:text-amber-400">
                    {nickname}
                  </span>
                </div>

                <span className="hidden text-center font-bold text-zinc-400 sm:block">
                  {player.exact_predictions}
                </span>

                <div className="text-right">
                  <span className="text-xl font-black text-amber-400">
                    {player.total_points}
                  </span>
                  <p className="text-[10px] font-bold uppercase text-zinc-600 sm:hidden">
                    bodů
                  </p>
                </div>

                <ChevronRight
                  size={18}
                  className="hidden text-zinc-600 transition group-hover:translate-x-1 group-hover:text-amber-400 sm:block"
                />
              </Link>
            );
          })
        )}
      </section>
    </main>
  );
}
