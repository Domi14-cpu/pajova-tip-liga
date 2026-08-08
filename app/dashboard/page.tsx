"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  nickname: string | null;
  total_points: number;
  exact_predictions: number;
};

type Match = {
  id: number;
  competition: string;
  home_team: string;
  away_team: string;
  starts_at: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  home_score: number | null;
  away_score: number | null;
};

type Prediction = {
  id: number;
  match_id: number;
  home_score: number;
  away_score: number;
  points: number | null;
  updated_at: string | null;
  created_at: string;
};

type LastResult = {
  prediction: Prediction;
  match: Match;
};

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [rank, setRank] = useState(0);
  const [accuracy, setAccuracy] = useState(0);

  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const [
        profileResult,
        profilesResult,
        predictionsResult,
        upcomingResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, nickname, total_points, exact_predictions")
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("profiles")
          .select("id, total_points, exact_predictions")
          .order("total_points", { ascending: false })
          .order("exact_predictions", { ascending: false }),

        supabase
          .from("predictions")
          .select(
            "id, match_id, home_score, away_score, points, updated_at, created_at"
          )
          .eq("user_id", user.id),

        supabase
          .from("matches")
          .select(`
            id,
            competition,
            home_team,
            away_team,
            starts_at,
            status,
            home_score,
            away_score
          `)
          .eq("status", "scheduled")
          .gt("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(4),
      ]);

      if (profileResult.error) {
        setMessage(
          `Profil se nepodařilo načíst: ${profileResult.error.message}`
        );
        setLoading(false);
        return;
      }

      const loadedProfile = profileResult.data as Profile | null;

      const fallbackProfile: Profile = {
        id: user.id,
        nickname:
          user.user_metadata?.nickname ||
          user.email?.split("@")[0] ||
          "Tipér",
        total_points: 0,
        exact_predictions: 0,
      };

      setProfile(loadedProfile ?? fallbackProfile);

      if (!profilesResult.error && profilesResult.data) {
        const position =
          profilesResult.data.findIndex(
            (item) => item.id === user.id
          ) + 1;

        setRank(position > 0 ? position : 0);
      }

      const predictions =
        (predictionsResult.data as Prediction[] | null) ?? [];

      const evaluatedPredictions = predictions.filter(
        (prediction) => prediction.points !== null
      );

      const successfulPredictions = evaluatedPredictions.filter(
        (prediction) =>
          prediction.points !== null && prediction.points > 0
      );

      const calculatedAccuracy =
        evaluatedPredictions.length > 0
          ? Math.round(
              (successfulPredictions.length /
                evaluatedPredictions.length) *
                100
            )
          : 0;

      setAccuracy(calculatedAccuracy);

      if (!upcomingResult.error) {
        setUpcomingMatches(
          (upcomingResult.data as Match[] | null) ?? []
        );
      }

      const finishedPredictions = [...predictions]
        .filter((prediction) => prediction.points !== null)
        .sort((a, b) => {
          const dateA = new Date(
            a.updated_at || a.created_at
          ).getTime();

          const dateB = new Date(
            b.updated_at || b.created_at
          ).getTime();

          return dateB - dateA;
        });

      if (finishedPredictions.length > 0) {
        const latestPrediction = finishedPredictions[0];

        const { data: matchData } = await supabase
          .from("matches")
          .select(`
            id,
            competition,
            home_team,
            away_team,
            starts_at,
            status,
            home_score,
            away_score
          `)
          .eq("id", latestPrediction.match_id)
          .maybeSingle();

        if (matchData) {
          setLastResult({
            prediction: latestPrediction,
            match: matchData as Match,
          });
        }
      }

      setLoading(false);
    }

    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-90px)] items-center justify-center bg-[#080808] px-5 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" />

          <p className="mt-5 font-bold text-zinc-400">
            Načítám dashboard…
          </p>
        </div>
      </main>
    );
  }

  const nickname = profile?.nickname || "Tipér";

  const firstName =
    nickname === "Domi14"
      ? "Domi14"
      : nickname;

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-5 sm:py-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-7 sm:p-10">
  <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(251,191,36,0.13),transparent_40%)]" />

  <div className="relative flex items-start justify-between gap-4">
    <div>
      <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
        Pájova Tip Liga
      </p>

      <h1 className="mt-3 text-4xl font-black sm:text-5xl">
        Ahoj, {firstName} 👋
      </h1>

      <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
        Tady vidíš svoje aktuální body, pořadí, statistiky a
        nejbližší zápasy k tipování.
      </p>
    </div>

    <button
      type="button"
      className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition hover:border-amber-400/40 hover:bg-white/10"
      aria-label="Oznámení"
    >
      <Bell size={22} />

      <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-black">
        0
      </span>
    </button>
  </div>
</section>

        {message && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-300">
            {message}
          </div>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-3xl font-black text-amber-400">
              {profile?.total_points ?? 0}
            </p>

            <p className="mt-2 text-sm font-semibold text-zinc-500">
              Celkem bodů
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-3xl font-black text-amber-400">
              {rank > 0 ? `${rank}.` : "–"}
            </p>

            <p className="mt-2 text-sm font-semibold text-zinc-500">
              Aktuální pořadí
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-3xl font-black text-amber-400">
              {profile?.exact_predictions ?? 0}
            </p>

            <p className="mt-2 text-sm font-semibold text-zinc-500">
              Přesných tipů
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-3xl font-black text-amber-400">
              {accuracy} %
            </p>

            <p className="mt-2 text-sm font-semibold text-zinc-500">
              Úspěšnost
            </p>
          </article>
        </section>

        <section className="mt-12">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
                Další tipy
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Nadcházející zápasy
              </h2>
            </div>

            <Link
              href="/matches"
              className="text-sm font-bold text-zinc-400 transition hover:text-white"
            >
              Zobrazit všechny →
            </Link>
          </div>

          {upcomingMatches.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-8 text-center">
              <p className="text-xl font-black">
                Momentálně nejsou žádné nadcházející zápasy.
              </p>

              <p className="mt-2 text-zinc-500">
                Jakmile administrátor přidá další zápasy, zobrazí se
                tady automaticky.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {upcomingMatches.map((match) => {
                const kickoff = new Date(match.starts_at);

                return (
                  <article
                    key={match.id}
                    className="grid items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5 md:grid-cols-[190px_1fr_auto]"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        {match.competition}
                      </p>

                      <p className="mt-1 font-black text-amber-400">
                        {kickoff.toLocaleDateString("cs-CZ", {
                          weekday: "short",
                          day: "numeric",
                          month: "numeric",
                        })}
                        {" · "}
                        {kickoff.toLocaleTimeString("cs-CZ", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
                      <p className="break-words text-right font-bold">
                        {match.home_team}
                      </p>

                      <span className="text-sm font-black text-zinc-600">
                        VS
                      </span>

                      <p className="break-words font-bold">
                        {match.away_team}
                      </p>
                    </div>

                    <Link
                      href={`/matches/${match.id}`}
                      className="rounded-xl bg-amber-400 px-5 py-3 text-center text-sm font-black text-black transition hover:bg-amber-300"
                    >
                      Tipovat
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <h2 className="text-xl font-black">
              Poslední vyhodnocený tip
            </h2>

            {!lastResult ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black p-6 text-center">
                <p className="font-bold text-zinc-400">
                  Zatím nemáš žádný vyhodnocený tip.
                </p>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {lastResult.match.competition}
                </p>

                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-black">
                      {lastResult.match.home_team}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      vs. {lastResult.match.away_team}
                    </p>
                  </div>

                  {lastResult.match.home_score !== null &&
                    lastResult.match.away_score !== null && (
                      <p className="whitespace-nowrap text-2xl font-black text-white">
                        {lastResult.match.home_score} :{" "}
                        {lastResult.match.away_score}
                      </p>
                    )}
                </div>

                <div className="mt-5 border-t border-white/10 pt-5">
                  <p className="text-sm text-zinc-400">
                    Tvůj tip:{" "}
                    <strong className="text-white">
                      {lastResult.prediction.home_score} :{" "}
                      {lastResult.prediction.away_score}
                    </strong>
                  </p>

                  <p
                    className={`mt-3 text-xl font-black ${
                      (lastResult.prediction.points ?? 0) > 0
                        ? "text-green-400"
                        : (lastResult.prediction.points ?? 0) < 0
                          ? "text-red-400"
                          : "text-zinc-400"
                    }`}
                  >
                    Získané body:{" "}
                    {(lastResult.prediction.points ?? 0) > 0
                      ? `+${lastResult.prediction.points}`
                      : lastResult.prediction.points ?? 0}
                  </p>
                </div>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <h2 className="text-xl font-black">
              Bodovací pravidla
            </h2>

            <div className="mt-5 space-y-3 text-sm">
              {[
                ["Přesná remíza", "+4"],
                ["Přesný výsledek", "+3"],
                ["Nepřesná remíza", "+2"],
                ["Správný vítěz", "+1"],
                ["Netrefeno", "−1"],
                ["Bez tipu", "−2"],
              ].map(([label, points]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-white/10 pb-3"
                >
                  <span className="text-zinc-400">
                    {label}
                  </span>

                  <span className="font-black">
                    {points}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}