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
  avatar_url: string | null;
};

type RankedProfile = {
  id: string;
};

type FinishedMatch = {
  id: number;
  competition: string;
  home_team: string;
  away_team: string;
  starts_at: string;
  home_score: number;
  away_score: number;
};

type Prediction = {
  match_id: number;
  home_score: number;
  away_score: number;
  points: number | null;
};

type PastTip = {
  match: FinishedMatch;
  prediction: Prediction;
};

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const playerId = params.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [rank, setRank] = useState(0);
  const [pastTips, setPastTips] = useState<PastTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setMessage("");

      const [profileResult, rankingResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, nickname, total_points, exact_predictions, avatar_url")
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

      const { data: matchData, error: matchesError } = await supabase
        .from("matches")
        .select(
          "id, competition, home_team, away_team, starts_at, home_score, away_score"
        )
        .eq("status", "finished")
        .not("home_score", "is", null)
        .not("away_score", "is", null)
        .order("starts_at", { ascending: false })
        .limit(50);

      if (matchesError) {
        console.error("Ukončené zápasy se nepodařilo načíst:", matchesError);
        setPastTips([]);
      } else {
        const finishedMatches = (matchData ?? []) as FinishedMatch[];
        const matchIds = finishedMatches.map((match) => match.id);

        if (matchIds.length > 0) {
          const { data: predictionData, error: predictionsError } =
            await supabase
              .from("predictions")
              .select("match_id, home_score, away_score, points")
              .eq("user_id", playerId)
              .in("match_id", matchIds);

          if (predictionsError) {
            console.error(
              "Veřejné tipy se nepodařilo načíst:",
              predictionsError
            );
            setPastTips([]);
          } else {
            const predictions = (predictionData ?? []) as Prediction[];
            const predictionByMatch = new Map(
              predictions.map((prediction) => [
                prediction.match_id,
                prediction,
              ])
            );

            setPastTips(
              finishedMatches
                .flatMap((match) => {
                  const prediction = predictionByMatch.get(match.id);
                  return prediction ? [{ match, prediction }] : [];
                })
                .slice(0, 10)
            );
          }
        } else {
          setPastTips([]);
        }
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
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-amber-400/20 bg-amber-400 text-4xl font-black text-black shadow-xl shadow-amber-400/10">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={nickname}
                className="h-full w-full object-cover"
              />
            ) : (
              nickname.charAt(0).toUpperCase()
            )}
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
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400">
            Historie
          </p>
          <h2 className="mt-2 text-2xl font-black">Ukončené tipy</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Zobrazují se pouze tipy k již ukončeným zápasům.
          </p>
        </div>

        {pastTips.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-7 text-center text-zinc-500">
            Tento tipér zatím nemá žádný veřejný ukončený tip.
          </div>
        ) : (
          <div className="mt-6">
            <div className="mb-2 hidden grid-cols-[1fr_80px_80px_64px] gap-4 px-5 text-[10px] font-bold uppercase tracking-wider text-zinc-600 sm:grid">
              <span>Zápas</span>
              <span className="text-center">Tip</span>
              <span className="text-center">Výsledek</span>
              <span className="text-right">Body</span>
            </div>

            <div className="grid gap-3">
            {pastTips.map(({ match, prediction }) => {
              const points = prediction.points ?? 0;

              return (
                <Link
                  key={match.id}
                  href={`/matches/${match.id}`}
                  className="grid gap-4 rounded-2xl border border-white/10 bg-black/40 p-4 transition hover:border-amber-400/30 hover:bg-black/60 sm:grid-cols-[1fr_80px_80px_64px] sm:items-center sm:p-5"
                >
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                      {match.competition} · {new Date(match.starts_at).toLocaleDateString("cs-CZ")}
                    </p>
                    <p className="mt-2 truncate font-black">
                      {match.home_team} – {match.away_team}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:block sm:text-center">
                    <span className="text-xs font-bold uppercase text-zinc-600 sm:hidden">
                      Tip
                    </span>
                    <p className="font-black">
                      {prediction.home_score} : {prediction.away_score}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:block sm:text-center">
                    <span className="text-xs font-bold uppercase text-zinc-600 sm:hidden">
                      Výsledek
                    </span>
                    <p className="font-black text-zinc-400">
                      {match.home_score} : {match.away_score}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:block sm:min-w-16 sm:text-right">
                    <span className="text-xs font-bold uppercase text-zinc-600 sm:hidden">
                      Body
                    </span>
                    <p
                      className={`text-lg font-black ${
                        points > 0
                          ? "text-green-400"
                          : points < 0
                            ? "text-red-400"
                            : "text-zinc-400"
                      }`}
                    >
                      {points > 0 ? `+${points}` : points}
                    </p>
                  </div>
                </Link>
              );
            })}
            </div>
          </div>
        )}
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
