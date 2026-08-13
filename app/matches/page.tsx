"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "cancelled";

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
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
  sports: {
    name: string;
    icon: string | null;
  }[];
};

type MatchWithTeams = Match & {
  homeTeam: Team | null;
  awayTeam: Team | null;
};

type FilterType = "all" | "open" | "finished";

function getStatusLabel(status: MatchStatus, isOpen: boolean) {
  if (isOpen) return "Tipování otevřeno";
  if (status === "live") return "Právě probíhá";
  if (status === "finished") return "Ukončeno";
  if (status === "cancelled") return "Zrušeno";

  return "Tipování uzavřeno";
}

function getStatusClasses(status: MatchStatus, isOpen: boolean) {
  if (isOpen) {
    return "border-green-500/25 bg-green-500/10 text-green-300";
  }

  if (status === "live") {
    return "border-red-500/25 bg-red-500/10 text-red-300";
  }

  if (status === "finished") {
    return "border-blue-400/20 bg-blue-400/10 text-blue-300";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-400";
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadMatches() {
      setLoading(true);
      setMessage("");

      const { data: matchesData, error: matchesError } =
        await supabase
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
            away_score,
            sports (
              name,
              icon
            )
          `)
          .order("starts_at", { ascending: true });

      if (matchesError) {
        setMessage(
          `Nepodařilo se načíst zápasy: ${matchesError.message}`
        );
        setLoading(false);
        return;
      }

      const loadedMatches =
        (matchesData as Match[] | null) ?? [];

      const teamIds = Array.from(
        new Set(
          loadedMatches
            .flatMap((match) => [
              match.home_team_id,
              match.away_team_id,
            ])
            .filter((id): id is number => id !== null)
        )
      );

      let teams: Team[] = [];

      if (teamIds.length > 0) {
        const { data: teamsData, error: teamsError } =
          await supabase
            .from("teams")
            .select("id, name, short_name, logo_url")
            .in("id", teamIds);

        if (teamsError) {
          setMessage(
            `Zápasy se načetly, ale loga týmů ne: ${teamsError.message}`
          );
        } else {
          teams = (teamsData as Team[] | null) ?? [];
        }
      }

      const matchesWithTeams: MatchWithTeams[] =
        loadedMatches.map((match) => ({
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

      setMatches(matchesWithTeams);
      setLoading(false);
    }

    loadMatches();
  }, []);

  const filteredMatches = useMemo(() => {
    const now = Date.now();

    return matches.filter((match) => {
      const kickoff = new Date(match.starts_at).getTime();

      const isOpen =
        match.status === "scheduled" && kickoff > now;

      if (filter === "open") {
        return isOpen;
      }

      if (filter === "finished") {
        return match.status === "finished";
      }

      return true;
    });
  }, [filter, matches]);

  const openMatchesCount = matches.filter((match) => {
    const kickoff = new Date(match.starts_at).getTime();

    return (
      match.status === "scheduled" &&
      kickoff > Date.now()
    );
  }).length;

  const finishedMatchesCount = matches.filter(
    (match) => match.status === "finished"
  ).length;

  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-white lg:pb-0">
      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(251,191,36,0.16),transparent_38%)]" />

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-12 sm:px-5 sm:pb-14 sm:pt-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full border border-amber-400/25 bg-amber-400/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-amber-300 sm:text-sm">
              🎯 Tipovací nabídka
            </div>

            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-6xl">
              Tipuj zápasy
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400 sm:mt-5 sm:text-lg sm:leading-8">
              Vyber zápas a odhadni přesný výsledek.
              Tipy ostatních zůstanou skryté až do
              skončení utkání.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 sm:max-w-xl sm:gap-4">
            <article className="rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur sm:p-5">
              <p className="text-2xl font-black text-amber-400 sm:text-3xl">
                {matches.length}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 sm:text-xs">
                Celkem
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur sm:p-5">
              <p className="text-2xl font-black text-green-300 sm:text-3xl">
                {openMatchesCount}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 sm:text-xs">
                Otevřené
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur sm:p-5">
              <p className="text-2xl font-black sm:text-3xl">
                {finishedMatchesCount}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 sm:text-xs">
                Ukončené
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-10">
        <div className="relative -mr-4 sm:mr-0">
          <div
            aria-label="Filtr zápasů"
            className="flex gap-2 overflow-x-auto scroll-px-4 pb-2 pr-8 sm:pr-0"
          >
          {[
            { value: "all", label: "Všechny zápasy" },
            { value: "open", label: "Otevřené tipování" },
            { value: "finished", label: "Ukončené" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                setFilter(item.value as FilterType)
              }
              className={`shrink-0 rounded-xl px-4 py-3 text-sm font-black transition ${
                filter === item.value
                  ? "bg-amber-400 text-black"
                  : "border border-white/10 bg-white/[0.035] text-zinc-400 hover:border-amber-400/30 hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
          </div>

          <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#080808] to-transparent sm:hidden" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-5 sm:pb-24">
        {loading && (
          <div className="flex min-h-72 items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.025]">
            <div className="text-center">
              <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" />
              <p className="mt-5 font-bold text-zinc-400">
                Načítám zápasy…
              </p>
            </div>
          </div>
        )}

        {message && (
          <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5 text-red-300">
            {message}
          </p>
        )}

        {!loading &&
          !message &&
          filteredMatches.length === 0 && (
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 text-center sm:p-12">
              <span className="text-5xl">🏟️</span>
              <h2 className="mt-5 text-2xl font-black">
                Žádné zápasy
              </h2>
              <p className="mx-auto mt-3 max-w-md text-zinc-400">
                V této kategorii teď nejsou žádné zápasy.
              </p>
            </div>
          )}

        {!loading && (
          <div className="grid gap-4 lg:gap-5">
            {filteredMatches.map((match) => {
              const start = new Date(match.starts_at);

              const isOpen =
                match.status === "scheduled" &&
                start.getTime() > Date.now();

              const hasResult =
                match.status === "finished" &&
                match.home_score !== null &&
                match.away_score !== null;

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
                  className="group overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.035] transition hover:border-amber-400/30 sm:rounded-[2rem]"
                >
                  <div className="p-5 sm:p-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">
                          {match.sports?.[0]?.icon}{" "}
                          {match.sports?.[0]?.name || "Sport"}
                        </p>

                        <p className="mt-2 break-words text-sm font-bold text-zinc-400">
                          {match.competition}
                        </p>
                      </div>

                      <span
                        className={`w-fit shrink-0 rounded-full border px-3 py-1.5 text-xs font-black ${getStatusClasses(
                          match.status,
                          isOpen
                        )}`}
                      >
                        {getStatusLabel(
                          match.status,
                          isOpen
                        )}
                      </span>
                    </div>

                    <div className="mt-5 flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm">
                      <span className="text-lg">📅</span>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-black text-white">
                          {start.toLocaleDateString(
                            "cs-CZ",
                            {
                              weekday: "short",
                              day: "numeric",
                              month: "numeric",
                              year: "numeric",
                            }
                          )}
                        </span>

                        <span className="text-zinc-600">
                          ·
                        </span>

                        <span className="font-black text-amber-400">
                          {start.toLocaleTimeString(
                            "cs-CZ",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="mt-7 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-6">
                      <div className="flex min-w-0 flex-col items-center text-center sm:items-end sm:text-right">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 sm:h-20 sm:w-20">
                          {match.homeTeam?.logo_url ? (
                            <Image
                              src={match.homeTeam.logo_url}
                              alt={homeName}
                              width={80}
                              height={80}
                              className="h-full w-full object-contain p-2"
                            />
                          ) : (
                            <span className="text-3xl">🏠</span>
                          )}
                        </div>

                        <p className="mt-3 break-words text-sm font-black leading-5 sm:text-xl">
                          {homeName}
                        </p>

                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                          Domácí
                        </p>
                      </div>

                      <div className="flex h-14 min-w-14 items-center justify-center rounded-2xl border border-white/10 bg-black px-3 text-center sm:h-16 sm:min-w-20">
                        {hasResult ? (
                          <p className="whitespace-nowrap text-xl font-black text-amber-400 sm:text-2xl">
                            {match.home_score} :{" "}
                            {match.away_score}
                          </p>
                        ) : (
                          <p className="text-xs font-black text-zinc-600 sm:text-sm">
                            VS
                          </p>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-col items-center text-center sm:items-start sm:text-left">
                        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 sm:h-20 sm:w-20">
                          {match.awayTeam?.logo_url ? (
                            <Image
                              src={match.awayTeam.logo_url}
                              alt={awayName}
                              width={80}
                              height={80}
                              className="h-full w-full object-contain p-2"
                            />
                          ) : (
                            <span className="text-3xl">✈️</span>
                          )}
                        </div>

                        <p className="mt-3 break-words text-sm font-black leading-5 sm:text-xl">
                          {awayName}
                        </p>

                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                          Hosté
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 bg-black/30 p-4 sm:flex sm:items-center sm:justify-between sm:px-7 sm:py-5">
                    <p className="hidden text-sm font-bold text-zinc-500 sm:block">
                      {isOpen
                        ? "Tip můžeš upravovat až do začátku zápasu."
                        : hasResult
                          ? "Zápas byl vyhodnocen."
                          : "Tipování už není dostupné."}
                    </p>

                    <Link
                      href={`/matches/${match.id}`}
                      className={`block w-full rounded-xl px-6 py-3.5 text-center text-sm font-black transition sm:w-auto ${
                        isOpen
                          ? "bg-amber-400 text-black hover:-translate-y-0.5 hover:bg-amber-300"
                          : "border border-white/10 bg-white/[0.04] text-zinc-300 hover:border-amber-400/30 hover:text-white"
                      }`}
                    >
                      {isOpen
                        ? "Tipovat zápas"
                        : hasResult
                          ? "Zobrazit výsledek"
                          : "Zobrazit zápas"}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
