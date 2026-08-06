"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "cancelled";

type Match = {
  id: number;
  competition: string;
  home_team: string;
  away_team: string;
  starts_at: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
};

type Prediction = {
  id: number;
  match_id: number;
  points: number | null;
};

function getStatusLabel(status: MatchStatus) {
  if (status === "scheduled") {
    return "Naplánovaný";
  }

  if (status === "live") {
    return "Probíhá";
  }

  if (status === "finished") {
    return "Ukončený";
  }

  return "Zrušený";
}

function getStatusClasses(status: MatchStatus) {
  if (status === "finished") {
    return "border-green-500/20 bg-green-500/10 text-green-300";
  }

  if (status === "live") {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  if (status === "cancelled") {
    return "border-zinc-500/20 bg-zinc-500/10 text-zinc-400";
  }

  return "border-amber-400/20 bg-amber-400/10 text-amber-300";
}

function isToday(value: string) {
  const date = new Date(value);
  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

export default function AdminEvaluationPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>(
    []
  );

  const [loadingData, setLoadingData] = useState(true);
  const [workingMatchId, setWorkingMatchId] = useState<
    number | null
  >(null);
  const [recalculatingAll, setRecalculatingAll] =
    useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoadingData(true);
    setMessage("");

    const [matchesResult, predictionsResult] =
      await Promise.all([
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
          .order("starts_at", { ascending: false }),

        supabase
          .from("predictions")
          .select("id, match_id, points"),
      ]);

    if (matchesResult.error) {
      setMessage(
        `Zápasy se nepodařilo načíst: ${matchesResult.error.message}`
      );
      setLoadingData(false);
      return;
    }

    if (predictionsResult.error) {
      setMessage(
        `Tipy se nepodařilo načíst: ${predictionsResult.error.message}`
      );
      setLoadingData(false);
      return;
    }

    setMatches((matchesResult.data as Match[] | null) ?? []);
    setPredictions(
      (predictionsResult.data as Prediction[] | null) ?? []
    );

    setLoadingData(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const finishedMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          match.status === "finished" &&
          match.home_score !== null &&
          match.away_score !== null
      ),
    [matches]
  );

  const unresolvedMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          match.status === "finished" &&
          (match.home_score === null ||
            match.away_score === null)
      ),
    [matches]
  );

  const todayMatches = useMemo(
    () => matches.filter((match) => isToday(match.starts_at)),
    [matches]
  );

  const awardedPoints = predictions.reduce(
    (sum, prediction) => sum + (prediction.points ?? 0),
    0
  );

  const pendingPredictions = predictions.filter(
    (prediction) => prediction.points === null
  ).length;

  function getPredictionCount(matchId: number) {
    return predictions.filter(
      (prediction) => prediction.match_id === matchId
    ).length;
  }

  function getMatchAwardedPoints(matchId: number) {
    return predictions
      .filter(
        (prediction) => prediction.match_id === matchId
      )
      .reduce(
        (sum, prediction) =>
          sum + (prediction.points ?? 0),
        0
      );
  }

  async function evaluateMatch(matchId: number) {
    const { error } = await supabase.rpc(
      "evaluate_match",
      {
        p_match_id: matchId,
      }
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  async function handleRecalculateMatch(match: Match) {
    if (
      match.status !== "finished" ||
      match.home_score === null ||
      match.away_score === null
    ) {
      setMessage(
        "Zápas musí být ukončený a musí mít vyplněný konečný výsledek."
      );
      return;
    }

    setWorkingMatchId(match.id);
    setMessage("");

    try {
      await evaluateMatch(match.id);

      setMessage(
        `Body pro zápas ${match.home_team} – ${match.away_team} byly úspěšně přepočítány.`
      );

      await loadData();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nastala neznámá chyba.";

      setMessage(
        `Přepočet bodů se nepodařil: ${errorMessage}`
      );
    } finally {
      setWorkingMatchId(null);
    }
  }

  async function handleRecalculateAll() {
    if (finishedMatches.length === 0) {
      setMessage(
        "Není žádný ukončený zápas s vyplněným výsledkem."
      );
      return;
    }

    const confirmed = window.confirm(
      `Opravdu chceš přepočítat body u všech ${finishedMatches.length} ukončených zápasů?`
    );

    if (!confirmed) {
      return;
    }

    setRecalculatingAll(true);
    setMessage("");

    let successful = 0;
    const failedMatches: string[] = [];

    for (const match of finishedMatches) {
      try {
        await evaluateMatch(match.id);
        successful += 1;
      } catch {
        failedMatches.push(
          `${match.home_team} – ${match.away_team}`
        );
      }
    }

    await loadData();
    setRecalculatingAll(false);

    if (failedMatches.length > 0) {
      setMessage(
        `Přepočítáno: ${successful}. Selhalo: ${failedMatches.length}. Problematické zápasy: ${failedMatches.join(
          ", "
        )}.`
      );
      return;
    }

    setMessage(
      `Body byly úspěšně přepočítány u všech ${successful} ukončených zápasů.`
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-14">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(251,191,36,0.12),transparent_35%)]" />

        <div className="relative flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
          <div>
            <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
              Administrace
            </p>

            <h1 className="mt-3 text-4xl font-black sm:text-5xl">
              Vyhodnocení
            </h1>

            <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
              Kontroluj výsledky zápasů a znovu
              přepočítávej body všech uživatelů.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRecalculateAll}
            disabled={
              recalculatingAll ||
              loadingData ||
              finishedMatches.length === 0
            }
            className="rounded-xl bg-amber-400 px-6 py-4 font-black text-black transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {recalculatingAll
              ? "Přepočítávám všechny body…"
              : "🔄 Přepočítat všechny body"}
          </button>
        </div>
      </section>

      {message && (
        <section className="mt-6">
          <p className="rounded-xl border border-white/10 bg-black p-4 text-center text-sm text-zinc-300">
            {message}
          </p>
        </section>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
            Ukončené zápasy
          </p>

          <p className="mt-3 text-4xl font-black text-amber-400">
            {finishedMatches.length}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
            Chybí výsledek
          </p>

          <p className="mt-3 text-4xl font-black">
            {unresolvedMatches.length}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
            Dnešní zápasy
          </p>

          <p className="mt-3 text-4xl font-black">
            {todayMatches.length}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
            Celkem tipů
          </p>

          <p className="mt-3 text-4xl font-black">
            {predictions.length}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
            Rozdané body
          </p>

          <p className="mt-3 text-4xl font-black">
            {awardedPoints}
          </p>
        </article>
      </section>

      {pendingPredictions > 0 && (
        <section className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-5">
          <p className="font-black text-amber-300">
            ⏳ {pendingPredictions}{" "}
            {pendingPredictions === 1
              ? "tip čeká"
              : "tipů čeká"}{" "}
            na vyhodnocení.
          </p>
        </section>
      )}

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
        <div>
          <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
            Výsledky
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Ukončené zápasy
          </h2>

          <p className="mt-3 text-zinc-400">
            U každého zápasu můžeš ručně spustit nový
            přepočet bodů.
          </p>
        </div>

        {loadingData ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" />

              <p className="mt-4 font-bold text-zinc-400">
                Načítám vyhodnocení…
              </p>
            </div>
          </div>
        ) : finishedMatches.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-black p-10 text-center">
            <span className="text-5xl">📊</span>

            <h3 className="mt-5 text-xl font-black">
              Zatím není co vyhodnocovat
            </h3>

            <p className="mt-3 text-zinc-400">
              Ukončené zápasy s vyplněným výsledkem se
              zobrazí zde.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {finishedMatches.map((match) => {
              const kickoff = new Date(match.starts_at);
              const predictionCount = getPredictionCount(
                match.id
              );
              const matchPoints = getMatchAwardedPoints(
                match.id
              );
              const working =
                workingMatchId === match.id;

              return (
                <article
                  key={match.id}
                  className="rounded-2xl border border-white/10 bg-black p-5 transition hover:border-amber-400/25 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        {match.competition}
                      </p>

                      <h3 className="mt-2 text-xl font-black">
                        {match.home_team} – {match.away_team}
                      </h3>

                      <p className="mt-2 text-sm text-zinc-500">
                        {kickoff.toLocaleDateString("cs-CZ")} ·{" "}
                        {kickoff.toLocaleTimeString(
                          "cs-CZ",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${getStatusClasses(
                        match.status
                      )}`}
                    >
                      {getStatusLabel(match.status)}
                    </span>
                  </div>

                  <div className="mt-7 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Výsledek
                      </p>

                      <p className="mt-2 text-2xl font-black text-amber-400">
                        {match.home_score} : {match.away_score}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Počet tipů
                      </p>

                      <p className="mt-2 text-2xl font-black">
                        {predictionCount}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                        Rozdané body
                      </p>

                      <p className="mt-2 text-2xl font-black">
                        {matchPoints}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      handleRecalculateMatch(match)
                    }
                    disabled={working || recalculatingAll}
                    className="mt-5 w-full rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-3.5 font-black text-amber-300 transition hover:bg-amber-400 hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {working
                      ? "Přepočítávám body…"
                      : "🔄 Přepočítat body zápasu"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {unresolvedMatches.length > 0 && (
        <section className="mt-8 rounded-[2rem] border border-red-500/20 bg-red-500/[0.05] p-6 sm:p-8">
          <p className="font-bold uppercase tracking-[0.22em] text-red-300">
            Vyžaduje pozornost
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Ukončené zápasy bez výsledku
          </h2>

          <div className="mt-7 grid gap-3">
            {unresolvedMatches.map((match) => (
              <article
                key={match.id}
                className="rounded-xl border border-red-500/20 bg-black p-5"
              >
                <p className="font-black">
                  {match.home_team} – {match.away_team}
                </p>

                <p className="mt-2 text-sm text-red-300">
                  Zápas je označený jako ukončený, ale nemá
                  kompletní výsledek.
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}