"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  nickname: string;
  total_points: number;
  exact_predictions: number;
};

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadLeaderboard() {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          nickname,
          total_points,
          exact_predictions
        `)
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
        </p>
      </section>

      <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035]">
        <div className="grid grid-cols-[65px_1fr_100px_100px] border-b border-white/10 px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500 sm:grid-cols-[90px_1fr_150px_120px]">
          <span>Pořadí</span>
          <span>Tipér</span>
          <span className="text-center">Přesné tipy</span>
          <span className="text-right">Body</span>
        </div>

        {loading ? (
          <p className="p-8 text-center text-zinc-400">
            Načítám žebříček…
          </p>
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

            return (
              <article
                key={player.id}
                className="grid grid-cols-[65px_1fr_100px_100px] items-center border-b border-white/10 px-5 py-5 last:border-0 sm:grid-cols-[90px_1fr_150px_120px]"
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
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-400 font-black text-black">
                    {player.nickname.charAt(0).toUpperCase()}
                  </div>

                  <span className="truncate font-black">
                    {player.nickname}
                  </span>
                </div>

                <span className="text-center font-bold text-zinc-400">
                  {player.exact_predictions}
                </span>

                <span className="text-right text-xl font-black text-amber-400">
                  {player.total_points}
                </span>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}