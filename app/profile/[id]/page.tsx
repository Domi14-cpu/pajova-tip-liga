"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Medal, Target, Trophy, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  nickname: string | null;
  total_points: number;
  exact_predictions: number;
};

type RankedProfile = {
  id: string;
};

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const playerId = params.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [rank, setRank] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setMessage("");

      const [profileResult, rankingResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, nickname, total_points, exact_predictions")
          .eq("id", playerId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("id")
          .order("total_points", { ascending: false })
          .order("exact_predictions", { ascending: false }),
      ]);

      if (profileResult.error) {
        setMessage(`Profil se nepodařilo načíst: ${profileResult.error.message}`);
        setLoading(false);
        return;
      }

      if (!profileResult.data) {
        setMessage("Tento profil neexistuje nebo není veřejně dostupný.");
        setLoading(false);
        return;
      }

      setProfile(profileResult.data as Profile);

      if (!rankingResult.error && rankingResult.data) {
        const rankedProfiles = rankingResult.data as RankedProfile[];
        const position =
          rankedProfiles.findIndex((item) => item.id === playerId) + 1;
        setRank(position > 0 ? position : 0);
      }

      setLoading(false);
    }

    if (playerId) {
      loadProfile();
    }
  }, [playerId]);

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-90px)] items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" />
          <p className="mt-5 font-bold text-zinc-400">Načítám profil…</p>
        </div>
      </main>
    );
  }

  if (!profile || message) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-14">
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 font-bold text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft size={18} /> Zpět na žebříček
        </Link>

        <div className="mt-8 rounded-[2rem] border border-red-500/20 bg-red-500/10 p-8 text-center text-red-300">
          {message || "Profil se nepodařilo načíst."}
        </div>
      </main>
    );
  }

  const nickname = profile.nickname || "Tipér";
  const stats = [
    {
      label: "Celkem bodů",
      value: profile.total_points,
      icon: Trophy,
    },
    {
      label: "Aktuální pořadí",
      value: rank > 0 ? `${rank}.` : "–",
      icon: Medal,
    },
    {
      label: "Přesných tipů",
      value: profile.exact_predictions,
      icon: Target,
    },
  ];

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-14">
      <Link
        href="/leaderboard"
        className="inline-flex items-center gap-2 font-bold text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft size={18} /> Zpět na žebříček
      </Link>

      <section className="relative mt-7 overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-7 sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(251,191,36,0.13),transparent_40%)]" />

        <div className="relative flex flex-col items-center text-center sm:flex-row sm:text-left">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-amber-400/20 bg-amber-400 text-4xl font-black text-black shadow-xl shadow-amber-400/10">
            {nickname.charAt(0).toUpperCase()}
          </div>

          <div className="mt-5 min-w-0 sm:ml-7 sm:mt-0">
            <div className="flex items-center justify-center gap-2 text-amber-400 sm:justify-start">
              <UserRound size={17} />
              <p className="text-xs font-bold uppercase tracking-[0.22em]">
                Veřejný profil tipéra
              </p>
            </div>

            <h1 className="mt-3 break-words text-4xl font-black sm:text-5xl">
              {nickname}
            </h1>

            <p className="mt-3 text-zinc-400">
              Hráč Pájovy Tip Ligy
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                <Icon size={21} />
              </div>
              <p className="mt-5 text-3xl font-black text-amber-400">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-semibold text-zinc-500">
                {stat.label}
              </p>
            </article>
          );
        })}
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-6 sm:p-8">
        <h2 className="text-xl font-black">O profilu</h2>
        <p className="mt-3 max-w-2xl leading-7 text-zinc-400">
          Tento profil zobrazuje pouze veřejné herní statistiky. E-mail ani
          jiné soukromé údaje uživatele nejsou ostatním tipérům dostupné.
        </p>
      </section>
    </main>
  );
}
