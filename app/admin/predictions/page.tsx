"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import DeleteDialog from "@/components/admin/DeleteDialog";
import { supabase } from "@/lib/supabase";

type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "cancelled";

type Profile = {
  id: string;
  nickname: string;
};

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
  user_id: string;
  match_id: number;
  home_score: number;
  away_score: number;
  points: number | null;
  created_at: string;
  updated_at: string;
};

type PredictionWithDetails = Prediction & {
  profile: Profile | null;
  match: Match | null;
};

type EditPredictionModalProps = {
  prediction: PredictionWithDetails | null;
  saving: boolean;
  onClose: () => void;
  onSave: (values: {
    homeScore: number;
    awayScore: number;
  }) => Promise<void>;
};

function getStatusLabel(status: MatchStatus) {
  if (status === "scheduled") return "Naplánovaný";
  if (status === "live") return "Probíhá";
  if (status === "finished") return "Ukončený";
  return "Zrušený";
}

function getPointsClasses(points: number | null) {
  if (points === null) {
    return "border-white/10 bg-white/[0.04] text-zinc-400";
  }

  if (points > 0) {
    return "border-green-500/20 bg-green-500/10 text-green-300";
  }

  if (points < 0) {
    return "border-red-500/20 bg-red-500/10 text-red-300";
  }

  return "border-white/10 bg-white/[0.04] text-zinc-400";
}

function EditPredictionModal({
  prediction,
  saving,
  onClose,
  onSave,
}: EditPredictionModalProps) {
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [localMessage, setLocalMessage] = useState("");

  useEffect(() => {
    if (!prediction) {
      return;
    }

    setHomeScore(String(prediction.home_score));
    setAwayScore(String(prediction.away_score));
    setLocalMessage("");
  }, [prediction]);

  if (!prediction) {
    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setLocalMessage("");

    const parsedHomeScore = Number(homeScore);
    const parsedAwayScore = Number(awayScore);

    if (
      !Number.isInteger(parsedHomeScore) ||
      !Number.isInteger(parsedAwayScore) ||
      parsedHomeScore < 0 ||
      parsedAwayScore < 0
    ) {
      setLocalMessage(
        "Obě hodnoty musí být nezáporná celá čísla."
      );
      return;
    }

    await onSave({
      homeScore: parsedHomeScore,
      awayScore: parsedAwayScore,
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Zavřít okno"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />

      <section className="relative z-10 w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#101010] p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
              Administrace
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Upravit tip
            </h2>

            <p className="mt-3 text-sm text-zinc-400">
              {prediction.profile?.nickname ?? "Neznámý uživatel"}
              {" · "}
              {prediction.match
                ? `${prediction.match.home_team} – ${prediction.match.away_team}`
                : "Neznámý zápas"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xl font-black text-zinc-400 transition hover:border-amber-400 hover:text-white disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 grid gap-5 sm:grid-cols-2"
        >
          <label>
            <span className="mb-2 block text-sm font-bold">
              Tip domácích
            </span>

            <input
              type="number"
              min="0"
              step="1"
              value={homeScore}
              onChange={(event) =>
                setHomeScore(event.target.value)
              }
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 text-center text-2xl font-black outline-none focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Tip hostů
            </span>

            <input
              type="number"
              min="0"
              step="1"
              value={awayScore}
              onChange={(event) =>
                setAwayScore(event.target.value)
              }
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-4 text-center text-2xl font-black outline-none focus:border-amber-400"
            />
          </label>

          {localMessage && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300 sm:col-span-2">
              {localMessage}
            </p>
          )}

          <div className="mt-2 flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-white/10 px-6 py-3.5 font-black text-zinc-300 transition hover:border-white/30 disabled:opacity-50"
            >
              Zrušit
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-amber-400 px-6 py-3.5 font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Ukládám změny…" : "Uložit změny"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function AdminPredictionsPage() {
  const [predictions, setPredictions] = useState<
    PredictionWithDetails[]
  >([]);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedMatchId, setSelectedMatchId] = useState("");

  const [editingPrediction, setEditingPrediction] =
    useState<PredictionWithDetails | null>(null);

  const [deletingPrediction, setDeletingPrediction] =
    useState<PredictionWithDetails | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoadingData(true);
    setMessage("");

    const [
      predictionsResult,
      profilesResult,
      matchesResult,
    ] = await Promise.all([
      supabase
        .from("predictions")
        .select(`
          id,
          user_id,
          match_id,
          home_score,
          away_score,
          points,
          created_at,
          updated_at
        `)
        .order("updated_at", { ascending: false }),

      supabase
        .from("profiles")
        .select("id, nickname")
        .order("nickname"),

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
    ]);

    if (predictionsResult.error) {
      setMessage(
        `Tipy se nepodařilo načíst: ${predictionsResult.error.message}`
      );
      setLoadingData(false);
      return;
    }

    if (profilesResult.error) {
      setMessage(
        `Uživatelé se nepodařili načíst: ${profilesResult.error.message}`
      );
      setLoadingData(false);
      return;
    }

    if (matchesResult.error) {
      setMessage(
        `Zápasy se nepodařily načíst: ${matchesResult.error.message}`
      );
      setLoadingData(false);
      return;
    }

    const loadedPredictions =
      (predictionsResult.data as Prediction[] | null) ?? [];

    const loadedProfiles =
      (profilesResult.data as Profile[] | null) ?? [];

    const loadedMatches =
      (matchesResult.data as Match[] | null) ?? [];

    setProfiles(loadedProfiles);
    setMatches(loadedMatches);

    setPredictions(
      loadedPredictions.map((prediction) => ({
        ...prediction,
        profile:
          loadedProfiles.find(
            (profile) => profile.id === prediction.user_id
          ) ?? null,
        match:
          loadedMatches.find(
            (match) => match.id === prediction.match_id
          ) ?? null,
      }))
    );

    setLoadingData(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredPredictions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return predictions.filter((prediction) => {
      const matchesUser =
        !selectedUserId ||
        prediction.user_id === selectedUserId;

      const matchesMatch =
        !selectedMatchId ||
        prediction.match_id === Number(selectedMatchId);

      const searchText = [
        prediction.profile?.nickname ?? "",
        prediction.match?.competition ?? "",
        prediction.match?.home_team ?? "",
        prediction.match?.away_team ?? "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchText.includes(query);

      return matchesUser && matchesMatch && matchesSearch;
    });
  }, [
    predictions,
    search,
    selectedUserId,
    selectedMatchId,
  ]);

  const evaluatedCount = predictions.filter(
    (prediction) => prediction.points !== null
  ).length;

  const pendingCount =
    predictions.length - evaluatedCount;

  const awardedPoints = predictions.reduce(
    (sum, prediction) => sum + (prediction.points ?? 0),
    0
  );

  async function recalculateMatch(matchId: number) {
    const match = matches.find(
      (currentMatch) => currentMatch.id === matchId
    );

    if (
      !match ||
      match.status !== "finished" ||
      match.home_score === null ||
      match.away_score === null
    ) {
      return;
    }

    const { error } = await supabase.rpc(
      "evaluate_match",
      {
        p_match_id: matchId,
      }
    );

    if (error) {
      throw new Error(
        `Tip byl změněn, ale přepočet bodů selhal: ${error.message}`
      );
    }
  }

  async function handleSaveEdit(values: {
    homeScore: number;
    awayScore: number;
  }) {
    if (!editingPrediction) {
      return;
    }

    setSavingEdit(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("predictions")
        .update({
          home_score: values.homeScore,
          away_score: values.awayScore,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingPrediction.id);

      if (error) {
        throw new Error(error.message);
      }

      await recalculateMatch(editingPrediction.match_id);

      setEditingPrediction(null);
      setMessage(
        "Tip byl úspěšně upraven a případné body byly přepočítány."
      );

      await loadData();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nastala neznámá chyba.";

      setMessage(
        `Tip se nepodařilo upravit: ${errorMessage}`
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeletePrediction() {
    if (!deletingPrediction) {
      return;
    }

    setDeleting(true);
    setMessage("");

    try {
      const deletedMatchId =
        deletingPrediction.match_id;

      const { error } = await supabase
        .from("predictions")
        .delete()
        .eq("id", deletingPrediction.id);

      if (error) {
        throw new Error(error.message);
      }

      await recalculateMatch(deletedMatchId);

      setDeletingPrediction(null);
      setMessage(
        "Tip byl smazán a případné body byly přepočítány."
      );

      await loadData();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nastala neznámá chyba.";

      setMessage(
        `Tip se nepodařilo smazat: ${errorMessage}`
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-14">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(251,191,36,0.12),transparent_35%)]" />

        <div className="relative">
          <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
            Administrace
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Tipy uživatelů
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
            Kontroluj, upravuj a maž tipy všech uživatelů.
          </p>
        </div>
      </section>

      {message && (
        <section className="mt-6">
          <p className="rounded-xl border border-white/10 bg-black p-4 text-center text-sm text-zinc-300">
            {message}
          </p>
        </section>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
            Celkem tipů
          </p>

          <p className="mt-3 text-4xl font-black text-amber-400">
            {predictions.length}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
            Vyhodnocené
          </p>

          <p className="mt-3 text-4xl font-black">
            {evaluatedCount}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
            Čekající
          </p>

          <p className="mt-3 text-4xl font-black">
            {pendingCount}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
            Body za tipy
          </p>

          <p className="mt-3 text-4xl font-black">
            {awardedPoints}
          </p>
        </article>
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
        <div>
          <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
            Filtry
          </p>

          <h2 className="mt-2 text-3xl font-black">
            Přehled všech tipů
          </h2>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Hledat tým, soutěž nebo tipéra…"
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none placeholder:text-zinc-600 focus:border-amber-400"
          />

          <select
            value={selectedUserId}
            onChange={(event) =>
              setSelectedUserId(event.target.value)
            }
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
          >
            <option value="">Všichni uživatelé</option>

            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.nickname}
              </option>
            ))}
          </select>

          <select
            value={selectedMatchId}
            onChange={(event) =>
              setSelectedMatchId(event.target.value)
            }
            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
          >
            <option value="">Všechny zápasy</option>

            {matches.map((match) => (
              <option key={match.id} value={match.id}>
                {match.home_team} – {match.away_team}
              </option>
            ))}
          </select>
        </div>

        {loadingData ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" />

              <p className="mt-4 font-bold text-zinc-400">
                Načítám tipy…
              </p>
            </div>
          </div>
        ) : filteredPredictions.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-white/10 bg-black p-8 text-center text-zinc-400">
            Nebyl nalezen žádný tip.
          </p>
        ) : (
          <div className="mt-7 grid gap-4">
            {filteredPredictions.map((prediction) => {
              const match = prediction.match;
              const profile = prediction.profile;

              const kickoff = match
                ? new Date(match.starts_at)
                : null;

              return (
                <article
                  key={prediction.id}
                  className="rounded-2xl border border-white/10 bg-black p-5 transition hover:border-amber-400/25 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 font-black text-black">
                          {(profile?.nickname ?? "?")
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                        <div>
                          <p className="font-black">
                            {profile?.nickname ??
                              "Neznámý uživatel"}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            Tip ID: {prediction.id}
                          </p>
                        </div>
                      </div>

                      <p className="mt-5 text-xs font-bold uppercase tracking-wider text-amber-400">
                        {match?.competition ??
                          "Neznámá soutěž"}
                      </p>

                      {kickoff && (
                        <p className="mt-2 text-sm text-zinc-500">
                          {kickoff.toLocaleDateString(
                            "cs-CZ"
                          )}{" "}
                          ·{" "}
                          {kickoff.toLocaleTimeString(
                            "cs-CZ",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {match && (
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-zinc-400">
                          {getStatusLabel(match.status)}
                        </span>
                      )}

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${getPointsClasses(
                          prediction.points
                        )}`}
                      >
                        {prediction.points === null
                          ? "Čeká na body"
                          : prediction.points > 0
                            ? `+${prediction.points} bodů`
                            : `${prediction.points} bodů`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-7 grid items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.025] p-5 md:grid-cols-[1fr_auto_1fr_auto]">
                    <p className="text-center font-black md:text-right">
                      {match?.home_team ?? "Domácí"}
                    </p>

                    <div className="text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                        Tip
                      </p>

                      <p className="mt-1 text-2xl font-black text-amber-400">
                        {prediction.home_score} :{" "}
                        {prediction.away_score}
                      </p>
                    </div>

                    <p className="text-center font-black md:text-left">
                      {match?.away_team ?? "Hosté"}
                    </p>

                    <div className="text-center md:min-w-24 md:text-right">
                      {match &&
                      match.home_score !== null &&
                      match.away_score !== null ? (
                        <>
                          <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                            Výsledek
                          </p>

                          <p className="mt-1 text-xl font-black">
                            {match.home_score} :{" "}
                            {match.away_score}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm font-bold text-zinc-500">
                          Výsledek čeká
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingPrediction(prediction)
                      }
                      className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-300 transition hover:bg-amber-400 hover:text-black"
                    >
                      ✏️ Upravit tip
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDeletingPrediction(prediction)
                      }
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-500 hover:text-white"
                    >
                      🗑️ Smazat tip
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <EditPredictionModal
        prediction={editingPrediction}
        saving={savingEdit}
        onClose={() => {
          if (!savingEdit) {
            setEditingPrediction(null);
          }
        }}
        onSave={handleSaveEdit}
      />

      <DeleteDialog
        open={deletingPrediction !== null}
        title="Smazat tip?"
        description={
          deletingPrediction
            ? `Opravdu chceš smazat tip uživatele ${
                deletingPrediction.profile?.nickname ??
                "neznámý uživatel"
              } na zápas ${
                deletingPrediction.match
                  ? `${deletingPrediction.match.home_team} – ${deletingPrediction.match.away_team}`
                  : "neznámý zápas"
              }?`
            : ""
        }
        deleting={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeletingPrediction(null);
          }
        }}
        onConfirm={handleDeletePrediction}
      />
    </main>
  );
}