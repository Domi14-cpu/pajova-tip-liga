"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bell,
  ChartNoAxesCombined,
  Medal,
  Target,
  Trophy,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  nickname: string | null;
  total_points: number;
  exact_predictions: number;
};

type Team = {
  id: number;
  name: string;
  short_name: string | null;
  logo_url: string | null;
};

type Match = {
  id: number;
  competition: string;
  home_team: string;
  away_team: string;
  home_team_id: number | null;
  away_team_id: number | null;
  starts_at: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  home_score: number | null;
  away_score: number | null;
};

type MatchWithTeams = Match & {
  homeTeam: Team | null;
  awayTeam: Team | null;
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
  match: MatchWithTeams;
};

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [rank, setRank] = useState(0);
  const [accuracy, setAccuracy] = useState(0);

  const [upcomingMatches, setUpcomingMatches] = useState<
    MatchWithTeams[]
  >([]);

  const [lastResult, setLastResult] =
    useState<LastResult | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadTeamsForMatches(
      matches: Match[]
    ): Promise<MatchWithTeams[]> {
      const teamIds = Array.from(
        new Set(
          matches
            .flatMap((match) => [
              match.home_team_id,
              match.away_team_id,
            ])
            .filter((id): id is number => id !== null)
        )
      );

      if (teamIds.length === 0) {
        return matches.map((match) => ({
          ...match,
          homeTeam: null,
          awayTeam: null,
        }));
      }

      const { data: teamsData, error: teamsError } =
        await supabase
          .from("teams")
          .select("id, name, short_name, logo_url")
          .in("id", teamIds);

      if (teamsError) {
        console.error("Chyba při načítání týmů:", teamsError);

        return matches.map((match) => ({
          ...match,
          homeTeam: null,
          awayTeam: null,
        }));
      }

      const teams = (teamsData as Team[] | null) ?? [];

      return matches.map((match) => ({
        ...match,
        homeTeam:
          teams.find(
            (team) => team.id === match.home_team_id
          ) ?? null,
        awayTeam:
          teams.find(
            (team) => team.id === match.away_team_id
          ) ?? null,
      }));
    }

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
          .select(
            "id, nickname, total_points, exact_predictions"
          )
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("profiles")
          .select(
            "id, total_points, exact_predictions"
          )
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
            home_team_id,
            away_team_id,
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

      const loadedProfile =
        profileResult.data as Profile | null;

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

      if (
        !profilesResult.error &&
        profilesResult.data
      ) {
        const position =
          profilesResult.data.findIndex(
            (item) => item.id === user.id
          ) + 1;

        setRank(position > 0 ? position : 0);
      }

      const predictions =
        (predictionsResult.data as Prediction[] | null) ??
        [];

      const evaluatedPredictions = predictions.filter(
        (prediction) => prediction.points !== null
      );

      const successfulPredictions =
        evaluatedPredictions.filter(
          (prediction) =>
            prediction.points !== null &&
            prediction.points > 0
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

      if (
        !upcomingResult.error &&
        upcomingResult.data
      ) {
        const loadedUpcoming =
          (upcomingResult.data as Match[] | null) ?? [];

        const upcomingWithTeams =
          await loadTeamsForMatches(loadedUpcoming);

        setUpcomingMatches(upcomingWithTeams);
      } else {
        setUpcomingMatches([]);
      }

      const finishedPredictions = [...predictions]
        .filter(
          (prediction) => prediction.points !== null
        )
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
        const latestPrediction =
          finishedPredictions[0];

        const { data: matchData } = await supabase
          .from("matches")
          .select(`
            id,
            competition,
            home_team,
            away_team,
            home_team_id,
            away_team_id,
            starts_at,
            status,
            home_score,
            away_score
          `)
          .eq("id", latestPrediction.match_id)
          .maybeSingle();

        if (matchData) {
          const matchesWithTeams =
            await loadTeamsForMatches([
              matchData as Match,
            ]);

          setLastResult({
            prediction: latestPrediction,
            match: matchesWithTeams[0],
          });
        }
      } else {
        setLastResult(null);
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

  const stats = [
    {
      label: "Celkem bodů",
      value: profile?.total_points ?? 0,
      icon: Trophy,
    },
    {
      label: "Aktuální pořadí",
      value: rank > 0 ? `${rank}.` : "–",
      icon: Medal,
    },
    {
      label: "Přesných tipů",
      value: profile?.exact_predictions ?? 0,
      icon: Target,
    },
    {
      label: "Úspěšnost",
      value: `${accuracy} %`,
      icon: ChartNoAxesCombined,
    },
  ];

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-5 sm:py-12">
        <section className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-5 sm:rounded-[2rem] sm:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(251,191,36,0.13),transparent_40%)]" />

          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400 sm:text-sm">
                Pájova Tip Liga
              </p>

              <h1 className="mt-3 text-3xl font-black sm:text-5xl">
                Ahoj, {nickname} 👋
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:mt-4 sm:text-base sm:leading-7">
                Tady vidíš svoje body, pořadí,
                statistiky a nejbližší zápasy.
              </p>
            </div>

            <button
              type="button"
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition hover:border-amber-400/40 hover:bg-white/10 sm:h-12 sm:w-12"
              aria-label="Oznámení"
            >
              <Bell size={21} />

              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-black">
                0
              </span>
            </button>
          </div>
        </section>

        {message && (
          <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300 sm:mt-6 sm:p-5">
            {message}
          </div>
        )}

        <section className="mt-5 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <article
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-6"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400 sm:h-10 sm:w-10">
                  <Icon size={20} />
                </div>

                <p className="mt-4 text-2xl font-black text-amber-400 sm:text-3xl">
                  {stat.value}
                </p>

                <p className="mt-1 text-xs font-semibold text-zinc-500 sm:mt-2 sm:text-sm">
                  {stat.label}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-9 sm:mt-12">
          <div className="mb-5 flex items-end justify-between gap-3 sm:mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-400 sm:text-sm">
                Další tipy
              </p>

              <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                Nadcházející zápasy
              </h2>
            </div>

            <Link
              href="/matches"
              className="shrink-0 text-xs font-bold text-zinc-400 transition hover:text-white sm:text-sm"
            >
              Všechny →
            </Link>
          </div>

          {upcomingMatches.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-7 text-center sm:p-8">
              <p className="text-lg font-black sm:text-xl">
                Momentálně nejsou žádné nadcházející
                zápasy.
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Jakmile administrátor přidá další zápas,
                zobrazí se tady automaticky.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {upcomingMatches.map((match) => {
                const kickoff = new Date(
                  match.starts_at
                );

                const homeName =
                  match.homeTeam?.short_name ||
                  match.homeTeam?.name ||
                  match.home_team;

                const awayName =
                  match.awayTeam?.short_name ||
                  match.awayTeam?.name ||
                  match.away_team;

                return (
                  <article
                    key={match.id}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 sm:text-xs">
                            {match.competition}
                          </p>

                          <p className="mt-1 text-sm font-black text-amber-400">
                            {kickoff.toLocaleDateString(
                              "cs-CZ",
                              {
                                weekday: "short",
                                day: "numeric",
                                month: "numeric",
                              }
                            )}
                            {" · "}
                            {kickoff.toLocaleTimeString(
                              "cs-CZ",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </p>
                        </div>

                        <span className="rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[10px] font-black uppercase text-green-300">
                          Otevřeno
                        </span>
                      </div>

                      <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
                        <div className="flex min-w-0 flex-col items-center text-center">
                          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 sm:h-20 sm:w-20">
                            {match.homeTeam?.logo_url ? (
                              <Image
                                src={
                                  match.homeTeam
                                    .logo_url
                                }
                                alt={homeName}
                                width={80}
                                height={80}
                                className="h-full w-full object-contain p-2"
                              />
                            ) : (
                              <span className="text-2xl">
                                🏠
                              </span>
                            )}
                          </div>

                          <p className="mt-3 break-words text-sm font-black sm:text-lg">
                            {homeName}
                          </p>
                        </div>

                        <div className="flex h-12 min-w-12 items-center justify-center rounded-xl border border-white/10 bg-black px-3">
                          <span className="text-xs font-black text-zinc-600">
                            VS
                          </span>
                        </div>

                        <div className="flex min-w-0 flex-col items-center text-center">
                          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 sm:h-20 sm:w-20">
                            {match.awayTeam?.logo_url ? (
                              <Image
                                src={
                                  match.awayTeam
                                    .logo_url
                                }
                                alt={awayName}
                                width={80}
                                height={80}
                                className="h-full w-full object-contain p-2"
                              />
                            ) : (
                              <span className="text-2xl">
                                ✈️
                              </span>
                            )}
                          </div>

                          <p className="mt-3 break-words text-sm font-black sm:text-lg">
                            {awayName}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/10 bg-black/30 p-3 sm:flex sm:justify-end sm:p-4">
                      <Link
                        href={`/matches/${match.id}`}
                        className="block w-full rounded-xl bg-amber-400 px-5 py-3.5 text-center text-sm font-black text-black transition hover:bg-amber-300 sm:w-auto"
                      >
                        Tipovat zápas
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-9 grid gap-5 sm:mt-12 lg:grid-cols-2 lg:gap-6">
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
            <h2 className="text-xl font-black">
              Poslední vyhodnocený tip
            </h2>

            {!lastResult ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black p-6 text-center">
                <p className="font-bold text-zinc-400">
                  Zatím nemáš žádný vyhodnocený tip.
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-black p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  {lastResult.match.competition}
                </p>

                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="flex min-w-0 flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.035]">
                      {lastResult.match.homeTeam
                        ?.logo_url ? (
                        <Image
                          src={
                            lastResult.match.homeTeam
                              .logo_url
                          }
                          alt={
                            lastResult.match.homeTeam
                              .short_name ||
                            lastResult.match.homeTeam
                              .name
                          }
                          width={56}
                          height={56}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <span>🏠</span>
                      )}
                    </div>

                    <p className="mt-2 text-xs font-black sm:text-sm">
                      {lastResult.match.homeTeam
                        ?.short_name ||
                        lastResult.match.homeTeam
                          ?.name ||
                        lastResult.match.home_team}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-2xl font-black text-white">
                      {lastResult.match.home_score} :{" "}
                      {lastResult.match.away_score}
                    </p>

                    <p className="mt-1 text-[10px] font-bold uppercase text-zinc-600">
                      Výsledek
                    </p>
                  </div>

                  <div className="flex min-w-0 flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white/[0.035]">
                      {lastResult.match.awayTeam
                        ?.logo_url ? (
                        <Image
                          src={
                            lastResult.match.awayTeam
                              .logo_url
                          }
                          alt={
                            lastResult.match.awayTeam
                              .short_name ||
                            lastResult.match.awayTeam
                              .name
                          }
                          width={56}
                          height={56}
                          className="h-full w-full object-contain p-2"
                        />
                      ) : (
                        <span>✈️</span>
                      )}
                    </div>

                    <p className="mt-2 text-xs font-black sm:text-sm">
                      {lastResult.match.awayTeam
                        ?.short_name ||
                        lastResult.match.awayTeam
                          ?.name ||
                        lastResult.match.away_team}
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-white/10 pt-4 text-center">
                  <p className="text-sm text-zinc-400">
                    Tvůj tip:{" "}
                    <strong className="text-white">
                      {
                        lastResult.prediction
                          .home_score
                      }{" "}
                      :{" "}
                      {
                        lastResult.prediction
                          .away_score
                      }
                    </strong>
                  </p>

                  <p
                    className={`mt-2 text-2xl font-black ${
                      (lastResult.prediction
                        .points ?? 0) > 0
                        ? "text-green-400"
                        : (lastResult.prediction
                              .points ?? 0) < 0
                          ? "text-red-400"
                          : "text-zinc-400"
                    }`}
                  >
                    {(lastResult.prediction.points ??
                      0) > 0
                      ? `+${lastResult.prediction.points}`
                      : lastResult.prediction
                          .points ?? 0}{" "}
                    bodů
                  </p>
                </div>
              </div>
            )}
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 sm:p-6">
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