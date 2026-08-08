"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
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

type Prediction = {
  id: number;
  home_score: number;
  away_score: number;
  points: number | null;
};

function getStatusLabel(
  status: MatchStatus,
  isOpen: boolean
) {
  if (isOpen) return "Tipování otevřeno";
  if (status === "live") return "Právě probíhá";
  if (status === "finished") return "Ukončeno";
  if (status === "cancelled") return "Zrušeno";

  return "Tipování uzavřeno";
}

function getStatusClasses(
  status: MatchStatus,
  isOpen: boolean
) {
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

function getMessageClasses(message: string) {
  const loweredMessage = message.toLowerCase();

  if (
    loweredMessage.includes("úspěšně") ||
    loweredMessage.includes("uložen")
  ) {
    return "border-green-500/20 bg-green-500/10 text-green-300";
  }

  return "border-red-500/20 bg-red-500/10 text-red-300";
}

export default function MatchDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const matchId = Number(params.id);

  const [match, setMatch] = useState<Match | null>(null);
  const [homeTeam, setHomeTeam] = useState<Team | null>(null);
  const [awayTeam, setAwayTeam] = useState<Team | null>(null);

  const [prediction, setPrediction] =
    useState<Prediction | null>(null);

  const [homeTip, setHomeTip] = useState("");
  const [awayTip, setAwayTip] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPage(preserveMessage = false) {
    setLoading(true);

    if (!preserveMessage) {
      setMessage("");
    }

    if (!Number.isInteger(matchId) || matchId <= 0) {
      setMessage("Neplatné ID zápasu.");
      setMatch(null);
      setLoading(false);
      return;
    }

    const { data: matchData, error: matchError } =
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
        .eq("id", matchId)
        .maybeSingle();

    if (matchError || !matchData) {
      setMessage(
        matchError
          ? `Zápas se nepodařilo načíst: ${matchError.message}`
          : "Zápas nebyl nalezen."
      );

      setMatch(null);
      setLoading(false);
      return;
    }

    const loadedMatch = matchData as Match;

    setMatch(loadedMatch);

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
          `Loga týmů se nepodařilo načíst: ${teamsError.message}`
        );
      } else {
        const teams =
          (teamsData as Team[] | null) ?? [];

        setHomeTeam(
          teams.find(
            (team) =>
              team.id === loadedMatch.home_team_id
          ) ?? null
        );

        setAwayTeam(
          teams.find(
            (team) =>
              team.id === loadedMatch.away_team_id
          ) ?? null
        );
      }
    } else {
      setHomeTeam(null);
      setAwayTeam(null);
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setPrediction(null);
      setHomeTip("");
      setAwayTip("");
      setLoading(false);
      return;
    }

    const {
      data: predictionData,
      error: predictionError,
    } = await supabase
      .from("predictions")
      .select("id, home_score, away_score, points")
      .eq("match_id", matchId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (predictionError) {
      setMessage(
        `Uložený tip se nepodařilo načíst: ${predictionError.message}`
      );

      setLoading(false);
      return;
    }

    if (predictionData) {
      const savedPrediction =
        predictionData as Prediction;

      setPrediction(savedPrediction);
      setHomeTip(String(savedPrediction.home_score));
      setAwayTip(String(savedPrediction.away_score));
    } else {
      setPrediction(null);
      setHomeTip("");
      setAwayTip("");
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPage();
  }, [matchId]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");

    const parsedHomeTip = Number(homeTip);
    const parsedAwayTip = Number(awayTip);

    if (
      !Number.isInteger(parsedHomeTip) ||
      !Number.isInteger(parsedAwayTip) ||
      parsedHomeTip < 0 ||
      parsedAwayTip < 0
    ) {
      setMessage(
        "Zadej pro oba týmy platné nezáporné celé číslo."
      );
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    if (!match) {
      setMessage("Zápas není načtený.");
      return;
    }

    const kickoff = new Date(match.starts_at);

    if (
      match.status !== "scheduled" ||
      kickoff.getTime() <= Date.now()
    ) {
      setMessage(
        "Tipování tohoto zápasu už je uzavřené."
      );
      return;
    }

    setSaving(true);

    if (prediction) {
      const { error } = await supabase
        .from("predictions")
        .update({
          home_score: parsedHomeTip,
          away_score: parsedAwayTip,
          updated_at: new Date().toISOString(),
        })
        .eq("id", prediction.id)
        .eq("user_id", user.id);

      if (error) {
        setSaving(false);
        setMessage(
          `Tip se nepodařilo upravit: ${error.message}`
        );
        return;
      }

      setMessage("Tip byl úspěšně upraven.");
    } else {
      const { error } = await supabase
        .from("predictions")
        .insert({
          user_id: user.id,
          match_id: match.id,
          home_score: parsedHomeTip,
          away_score: parsedAwayTip,
        });

      if (error) {
        setSaving(false);
        setMessage(
          `Tip se nepodařilo uložit: ${error.message}`
        );
        return;
      }

      setMessage("Tip byl úspěšně uložen.");
    }

    setSaving(false);
    await loadPage(true);
  }

  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-84px)] items-center justify-center bg-[#080808] px-4 text-white">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" />

          <p className="mt-5 font-bold text-zinc-400">
            Načítám zápas…
          </p>
        </div>
      </main>
    );
  }

  if (!match) {
    return (
      <main className="min-h-screen bg-[#080808] px-4 py-14 text-white sm:px-5">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/matches"
            className="text-sm font-black text-zinc-400 transition hover:text-amber-400"
          >
            ← Zpět na zápasy
          </Link>

          <div className="mt-6 rounded-[2rem] border border-red-500/20 bg-red-500/10 p-7 text-center text-red-300">
            <span className="text-5xl">⚠️</span>

            <h1 className="mt-5 text-2xl font-black">
              Zápas se nepodařilo zobrazit
            </h1>

            <p className="mt-3">
              {message || "Zápas nebyl nalezen."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const kickoff = new Date(match.starts_at);

  const isOpen =
    match.status === "scheduled" &&
    kickoff.getTime() > Date.now();

  const hasResult =
    match.status === "finished" &&
    match.home_score !== null &&
    match.away_score !== null;

  const predictionPoints =
    prediction?.points ?? null;

  const homeName =
    homeTeam?.short_name ||
    homeTeam?.name ||
    match.home_team;

  const awayName =
    awayTeam?.short_name ||
    awayTeam?.name ||
    match.away_team;

  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] text-white">
      <section className="relative border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(251,191,36,0.16),transparent_40%)]" />

        <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-10">
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm font-black text-zinc-400 transition hover:border-amber-400/30 hover:text-white"
          >
            ← Zpět na zápasy
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-5 sm:py-12">
        <article className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.035] sm:rounded-[2rem]">
          <div className="p-5 sm:p-8 lg:p-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400 sm:text-sm">
                  {match.sports?.[0]?.icon}{" "}
                  {match.sports?.[0]?.name || "Sport"}
                </p>

                <h1 className="mt-3 break-words text-2xl font-black sm:text-4xl">
                  {match.competition}
                </h1>
              </div>

              <span
                className={`w-fit shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase ${getStatusClasses(
                  match.status,
                  isOpen
                )}`}
              >
                {getStatusLabel(match.status, isOpen)}
              </span>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-4 py-4">
              <span className="text-xl">📅</span>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-black">
                  {kickoff.toLocaleDateString("cs-CZ", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>

                <span className="text-zinc-600">·</span>

                <span className="font-black text-amber-400">
                  {kickoff.toLocaleTimeString("cs-CZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:mt-14 sm:gap-8">
              <div className="min-w-0 text-center sm:text-right">
                <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 sm:ml-auto sm:mr-0 sm:h-28 sm:w-28">
                  {homeTeam?.logo_url ? (
                    <Image
                      src={homeTeam.logo_url}
                      alt={homeName}
                      width={112}
                      height={112}
                      className="h-full w-full object-contain p-2 sm:p-3"
                    />
                  ) : (
                    <span className="text-3xl">🏠</span>
                  )}
                </div>

                <p className="mt-4 break-words text-base font-black leading-5 sm:text-2xl sm:leading-8">
                  {homeName}
                </p>

                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                  Domácí
                </p>
              </div>

              <div className="flex min-h-20 min-w-16 items-center justify-center rounded-2xl border border-white/10 bg-black px-3 text-center sm:min-h-24 sm:min-w-28">
                {hasResult ? (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                      Výsledek
                    </p>

                    <p className="mt-2 whitespace-nowrap text-2xl font-black text-amber-400 sm:text-4xl">
                      {match.home_score} :{" "}
                      {match.away_score}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-black text-zinc-600">
                    VS
                  </p>
                )}
              </div>

              <div className="min-w-0 text-center sm:text-left">
                <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/40 sm:ml-0 sm:mr-auto sm:h-28 sm:w-28">
                  {awayTeam?.logo_url ? (
                    <Image
                      src={awayTeam.logo_url}
                      alt={awayName}
                      width={112}
                      height={112}
                      className="h-full w-full object-contain p-2 sm:p-3"
                    />
                  ) : (
                    <span className="text-3xl">✈️</span>
                  )}
                </div>

                <p className="mt-4 break-words text-base font-black leading-5 sm:text-2xl sm:leading-8">
                  {awayName}
                </p>

                <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
                  Hosté
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 bg-black/30 p-4 sm:p-7">
            <form
              onSubmit={handleSubmit}
              className="mx-auto max-w-2xl rounded-[1.5rem] border border-white/10 bg-[#0b0b0b] p-5 sm:p-7"
            >
              <div className="text-center">
                <p className="font-black uppercase tracking-[0.16em] text-amber-400">
                  Tvůj tip
                </p>

                <h2 className="mt-2 text-2xl font-black sm:text-3xl">
                  Přesný výsledek
                </h2>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
                  Tip můžeš změnit až do začátku zápasu.
                </p>
              </div>

              <div className="mt-7 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3 sm:gap-5">
                <label className="min-w-0">
                  <span className="mb-2 block truncate text-center text-xs font-bold text-zinc-500">
                    {homeName}
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={homeTip}
                    onChange={(event) =>
                      setHomeTip(event.target.value)
                    }
                    disabled={!isOpen}
                    required
                    aria-label={`Skóre pro ${homeName}`}
                    className="h-20 w-full min-w-0 rounded-2xl border border-white/10 bg-[#111111] px-2 text-center text-3xl font-black outline-none transition focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-50 sm:h-24 sm:text-4xl"
                  />
                </label>

                <span className="pb-6 text-2xl font-black text-zinc-600 sm:pb-8">
                  :
                </span>

                <label className="min-w-0">
                  <span className="mb-2 block truncate text-center text-xs font-bold text-zinc-500">
                    {awayName}
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={awayTip}
                    onChange={(event) =>
                      setAwayTip(event.target.value)
                    }
                    disabled={!isOpen}
                    required
                    aria-label={`Skóre pro ${awayName}`}
                    className="h-20 w-full min-w-0 rounded-2xl border border-white/10 bg-[#111111] px-2 text-center text-3xl font-black outline-none transition focus:border-amber-400 disabled:cursor-not-allowed disabled:opacity-50 sm:h-24 sm:text-4xl"
                  />
                </label>
              </div>

              {prediction && (
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-center">
                  <p className="text-sm text-zinc-400">
                    Aktuálně uložený tip:
                    <strong className="ml-2 text-white">
                      {prediction.home_score} :{" "}
                      {prediction.away_score}
                    </strong>
                  </p>
                </div>
              )}

              {message && (
                <p
                  className={`mt-5 rounded-xl border p-4 text-center text-sm font-bold ${getMessageClasses(
                    message
                  )}`}
                >
                  {message}
                </p>
              )}

              {isOpen ? (
                <button
                  type="submit"
                  disabled={saving}
                  className="mt-5 w-full rounded-xl bg-amber-400 px-6 py-4 font-black text-black transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Ukládám tip…"
                    : prediction
                      ? "Upravit uložený tip"
                      : "Potvrdit tip"}
                </button>
              ) : (
                <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.035] p-4 text-center">
                  <p className="font-black text-zinc-300">
                    🔒 Tipování tohoto zápasu je uzavřené
                  </p>

                  {!prediction && (
                    <p className="mt-2 text-sm text-zinc-500">
                      Na tento zápas nemáš uložený tip.
                    </p>
                  )}
                </div>
              )}

              {!isOpen && predictionPoints !== null && (
                <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Získané body
                  </p>

                  <p className="mt-2 text-3xl font-black text-amber-400">
                    {predictionPoints > 0
                      ? `+${predictionPoints}`
                      : predictionPoints}
                  </p>
                </div>
              )}
            </form>
          </div>
        </article>
      </section>
    </main>
  );
}