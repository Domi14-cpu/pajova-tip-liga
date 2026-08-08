"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Team = {
  id: number;
  name: string;
  short_name: string | null;
  logo_url: string | null;
};

type FeaturedMatch = {
  id: number;
  competition: string;
  home_team: string;
  away_team: string;
  home_team_id: number | null;
  away_team_id: number | null;
  starts_at: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
};

type Player = {
  id: string;
  nickname: string;
  total_points: number;
  exact_predictions: number;
};

export default function Home() {
  const router = useRouter();

  const [featuredMatch, setFeaturedMatch] =
    useState<FeaturedMatch | null>(null);

  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);

  const [playersCount, setPlayersCount] = useState(0);
  const [matchesCount, setMatchesCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadHomepage() {
      setLoading(true);
      setMessage("");

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const wantsRules =
  typeof window !== "undefined" &&
  window.location.hash === "#jak-to-funguje";

if (session && !wantsRules) {
  router.replace("/dashboard");
  return;
}

      const now = new Date().toISOString();

      const [
        matchResult,
        leaderboardResult,
        playersCountResult,
        matchesCountResult,
      ] = await Promise.all([
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
            status
          `)
          .eq("status", "scheduled")
          .gte("starts_at", now)
          .order("starts_at", { ascending: true })
          .limit(1)
          .maybeSingle(),

        supabase
          .from("profiles")
          .select(`
            id,
            nickname,
            total_points,
            exact_predictions
          `)
          .order("total_points", { ascending: false })
          .order("exact_predictions", { ascending: false })
          .limit(5),

        supabase
          .from("profiles")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("matches")
          .select("*", { count: "exact", head: true }),
      ]);

      if (matchResult.error) {
        setMessage(
          `Nepodařilo se načíst nejbližší zápas: ${matchResult.error.message}`
        );
      }

      if (leaderboardResult.error) {
        setMessage(
          `Nepodařilo se načíst žebříček: ${leaderboardResult.error.message}`
        );
      }

      const loadedMatch =
        (matchResult.data as FeaturedMatch | null) ?? null;

      setFeaturedMatch(loadedMatch);

      setLeaderboard(
        (leaderboardResult.data as Player[] | null) ?? []
      );

      setPlayersCount(playersCountResult.count ?? 0);
      setMatchesCount(matchesCountResult.count ?? 0);

      if (loadedMatch) {
        const teamIds = [
          loadedMatch.home_team_id,
          loadedMatch.away_team_id,
        ].filter((id): id is number => id !== null);

        if (teamIds.length > 0) {
          const { data: teamsData, error: teamsError } =
            await supabase
              .from("teams")
              .select("id, name, short_name, logo_url")
              .in("id", teamIds);

          if (teamsError) {
            setMessage(
              `Nepodařilo se načíst týmy: ${teamsError.message}`
            );
          } else {
            const loadedTeams =
              (teamsData as Team[] | null) ?? [];

            setHomeTeam(
              loadedTeams.find(
                (team) =>
                  team.id === loadedMatch.home_team_id
              ) ?? null
            );

            setAwayTeam(
              loadedTeams.find(
                (team) =>
                  team.id === loadedMatch.away_team_id
              ) ?? null
            );
          }
        }
      }

      setLoading(false);
    }

    loadHomepage();
  }, [router]);

  const kickoff = featuredMatch
    ? new Date(featuredMatch.starts_at)
    : null;

  const displayedHomeName =
    homeTeam?.short_name ||
    homeTeam?.name ||
    featuredMatch?.home_team ||
    "Domácí";

  const displayedAwayName =
    awayTeam?.short_name ||
    awayTeam?.name ||
    featuredMatch?.away_team ||
    "Hosté";

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(251,191,36,0.18),transparent_35%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:py-28">
          <div>
            <div className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-black text-amber-400">
              🏆 Sportovní tipovací soutěž
            </div>

            <h1 className="mt-8 max-w-3xl text-5xl font-black leading-[0.95] sm:text-7xl">
              Nejlepší tipér
              <span className="block text-amber-400">
                vystoupí na vrchol.
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-zinc-400">
              Tipuj fotbal, hokej a další sporty. Sbírej body,
              porovnávej se s ostatními a bojuj o první místo.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/matches"
                className="rounded-xl bg-amber-400 px-7 py-4 font-black text-black transition hover:-translate-y-1 hover:bg-amber-300"
              >
                Začít tipovat
              </Link>

              <Link
                href="/#jak-to-funguje"
                className="rounded-xl border border-white/15 bg-white/[0.04] px-7 py-4 font-black transition hover:border-amber-400"
              >
                Jak liga funguje
              </Link>
            </div>

            <div className="mt-12 grid max-w-2xl grid-cols-2 gap-4">
              <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <p className="text-3xl font-black text-amber-400">
                  {playersCount}
                </p>

                <p className="mt-1 text-sm font-bold uppercase tracking-wider text-zinc-500">
                  Tipérů
                </p>
              </article>

              <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <p className="text-3xl font-black text-amber-400">
                  {matchesCount}
                </p>

                <p className="mt-1 text-sm font-bold uppercase tracking-wider text-zinc-500">
                  Zápasů
                </p>
              </article>
            </div>
          </div>

          <article className="rounded-[2rem] border border-white/10 bg-[#09090b] p-6 shadow-2xl sm:p-8">
            {loading ? (
              <div className="flex min-h-[430px] items-center justify-center">
                <p className="text-zinc-400">
                  Načítám nejbližší zápas…
                </p>
              </div>
            ) : featuredMatch && kickoff ? (
              <>
                <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-6">
                  <div>
                    <p className="text-sm font-bold text-zinc-500">
                      Nejbližší zápas
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      {featuredMatch.competition}
                    </h2>
                  </div>

                  <div className="rounded-full bg-amber-400/10 px-4 py-2 text-right text-xs font-black text-amber-400">
                    <p>
                      {kickoff.toLocaleDateString("cs-CZ")}
                    </p>

                    <p className="mt-1">
                      {kickoff.toLocaleTimeString("cs-CZ", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="mt-9 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <div className="flex min-w-0 flex-col items-center text-center">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                      {homeTeam?.logo_url ? (
                        <Image
                          src={homeTeam.logo_url}
                          alt={displayedHomeName}
                          width={96}
                          height={96}
                          className="h-full w-full object-contain p-3"
                        />
                      ) : (
                        <span className="text-4xl">🏠</span>
                      )}
                    </div>

                    <p className="mt-4 break-words font-black">
                      {displayedHomeName}
                    </p>
                  </div>

                  <div className="text-center">
                    <p className="text-xs font-black uppercase text-zinc-600">
                      VS
                    </p>

                    <p className="mt-3 text-2xl font-black text-amber-400">
                      – : –
                    </p>
                  </div>

                  <div className="flex min-w-0 flex-col items-center text-center">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                      {awayTeam?.logo_url ? (
                        <Image
                          src={awayTeam.logo_url}
                          alt={displayedAwayName}
                          width={96}
                          height={96}
                          className="h-full w-full object-contain p-3"
                        />
                      ) : (
                        <span className="text-4xl">✈️</span>
                      )}
                    </div>

                    <p className="mt-4 break-words font-black">
                      {displayedAwayName}
                    </p>
                  </div>
                </div>

                <Link
                  href={`/matches/${featuredMatch.id}`}
                  className="mt-9 block w-full rounded-xl bg-amber-400 px-6 py-4 text-center font-black text-black transition hover:bg-amber-300"
                >
                  Tipovat zápas
                </Link>
              </>
            ) : (
              <div className="flex min-h-[430px] flex-col items-center justify-center text-center">
                <span className="text-6xl">🏆</span>

                <h2 className="mt-6 text-2xl font-black">
                  Zatím není naplánovaný zápas
                </h2>

                <p className="mt-3 max-w-sm text-zinc-400">
                  Nový zápas se zde objeví automaticky po přidání
                  v administraci.
                </p>
              </div>
            )}
          </article>
        </div>
      </section>

      {message && (
        <section className="mx-auto max-w-7xl px-5 pt-8">
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {message}
          </p>
        </section>
      )}

      <section
        id="zebricek"
        className="border-b border-white/10 bg-white/[0.025]"
      >
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
              Průběžné pořadí
            </p>

            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Kdo vládne Tip Lize?
            </h2>

            <p className="mt-5 max-w-md leading-7 text-zinc-400">
              Žebříček se bude automaticky měnit podle bodů získaných
              za skutečné tipy.
            </p>

            <Link
              href="/leaderboard"
              className="mt-7 inline-block font-black text-amber-400"
            >
              Zobrazit celý žebříček →
            </Link>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
            <div className="grid grid-cols-[55px_1fr_90px] border-b border-white/10 px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500">
              <span>#</span>
              <span>Tipér</span>
              <span className="text-right">Body</span>
            </div>

            {leaderboard.length === 0 ? (
              <p className="p-7 text-center text-zinc-400">
                Žebříček je zatím prázdný.
              </p>
            ) : (
              leaderboard.map((player, index) => (
                <div
                  key={player.id}
                  className="grid grid-cols-[55px_1fr_90px] items-center border-b border-white/10 px-5 py-5 last:border-0"
                >
                  <span
                    className={
                      index === 0
                        ? "font-black text-amber-400"
                        : "font-bold text-zinc-500"
                    }
                  >
                    {index + 1}.
                  </span>

                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-black">
                      {player.nickname.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-bold">
                        {player.nickname}
                      </p>

                      <p className="text-xs text-zinc-500">
                        Přesných tipů: {player.exact_predictions}
                      </p>
                    </div>
                  </div>

                  <span className="text-right font-black">
                    {player.total_points}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section
        id="jak-to-funguje"
        className="mx-auto max-w-7xl px-5 py-24 text-center"
      >
        <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
          Jednoduchá pravidla
        </p>

        <h2 className="mt-3 text-3xl font-black sm:text-4xl">
          Tři kroky na vrchol
        </h2>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            [
              "01",
              "Vytvoř si účet",
              "Zaregistruj se a zvol si svoji přezdívku.",
            ],
            [
              "02",
              "Tipuj zápasy",
              "Vyber výsledek ještě před začátkem utkání.",
            ],
            [
              "03",
              "Sbírej body",
              "Stoupej žebříčkem a poraz ostatní tipéry.",
            ],
          ].map(([number, title, description]) => (
            <article
              key={number}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-8 text-left"
            >
              <span className="text-4xl font-black text-amber-400/30">
                {number}
              </span>

              <h3 className="mt-6 text-xl font-black">
                {title}
              </h3>

              <p className="mt-3 leading-7 text-zinc-400">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 pb-24">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-amber-400 px-6 py-14 text-center text-black sm:px-12">
          <h2 className="text-3xl font-black sm:text-5xl">
            Myslíš, že sportu rozumíš?
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-black/70">
            Přidej se k Pájově Tip Lize a ukaž všem, kdo je nejlepší
            tipér.
          </p>

          <Link
            href="/register"
            className="mt-8 inline-block rounded-xl bg-black px-8 py-4 font-black text-white transition hover:-translate-y-1"
          >
            Vytvořit účet zdarma
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Pájova Tip Liga</p>
          <p>Nejlepší tipér vystoupí na vrchol.</p>
        </div>
      </footer>
    </main>
  );
}