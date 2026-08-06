"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import DeleteDialog from "@/components/admin/DeleteDialog";
import { supabase } from "@/lib/supabase";

type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "cancelled";

type Sport = {
  id: number;
  name: string;
  icon: string | null;
};

type Competition = {
  id: number;
  sport_id: number;
  name: string;
  season: string | null;
};

type Team = {
  id: number;
  sport_id: number;
  name: string;
  short_name: string | null;
  logo_url: string | null;
};

type Match = {
  id: number;
  sport_id: number;
  competition_id: number | null;
  home_team_id: number | null;
  away_team_id: number | null;
  competition: string;
  home_team: string;
  away_team: string;
  starts_at: string;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
};

type EditMatchValues = {
  sportId: number;
  competitionId: number;
  homeTeamId: number;
  awayTeamId: number;
  startsAt: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
};

type EditMatchModalProps = {
  match: Match | null;
  sports: Sport[];
  competitions: Competition[];
  teams: Team[];
  saving: boolean;
  onClose: () => void;
  onSave: (values: EditMatchValues) => Promise<void>;
};

const statusOptions: {
  value: MatchStatus;
  label: string;
}[] = [
  { value: "scheduled", label: "Naplánovaný" },
  { value: "live", label: "Právě probíhá" },
  { value: "finished", label: "Ukončený" },
  { value: "cancelled", label: "Zrušený" },
];

function formatCompetitionName(competition: Competition) {
  return competition.season
    ? `${competition.name} ${competition.season}`
    : competition.name;
}

function formatStatus(status: MatchStatus) {
  return (
    statusOptions.find((option) => option.value === status)
      ?.label ?? status
  );
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

function toDateTimeLocal(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number: number) =>
    String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function EditMatchModal({
  match,
  sports,
  competitions,
  teams,
  saving,
  onClose,
  onSave,
}: EditMatchModalProps) {
  const [sportId, setSportId] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [status, setStatus] =
    useState<MatchStatus>("scheduled");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [localMessage, setLocalMessage] = useState("");

  useEffect(() => {
    if (!match) {
      return;
    }

    setSportId(String(match.sport_id));
    setCompetitionId(
      match.competition_id
        ? String(match.competition_id)
        : ""
    );
    setHomeTeamId(
      match.home_team_id ? String(match.home_team_id) : ""
    );
    setAwayTeamId(
      match.away_team_id ? String(match.away_team_id) : ""
    );
    setStartsAt(toDateTimeLocal(match.starts_at));
    setStatus(match.status);
    setHomeScore(
      match.home_score !== null
        ? String(match.home_score)
        : ""
    );
    setAwayScore(
      match.away_score !== null
        ? String(match.away_score)
        : ""
    );
    setLocalMessage("");
  }, [match]);

  if (!match) {
    return null;
  }

  const selectedSportId = Number(sportId);

  const filteredCompetitions = competitions.filter(
    (competition) =>
      competition.sport_id === selectedSportId
  );

  const filteredTeams = teams.filter(
    (team) => team.sport_id === selectedSportId
  );

  function handleSportChange(value: string) {
    setSportId(value);
    setCompetitionId("");
    setHomeTeamId("");
    setAwayTeamId("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setLocalMessage("");

    const parsedCompetitionId = Number(competitionId);
    const parsedHomeTeamId = Number(homeTeamId);
    const parsedAwayTeamId = Number(awayTeamId);

    if (
      !parsedCompetitionId ||
      !parsedHomeTeamId ||
      !parsedAwayTeamId
    ) {
      setLocalMessage(
        "Vyber soutěž, domácí tým a hostující tým."
      );
      return;
    }

    if (parsedHomeTeamId === parsedAwayTeamId) {
      setLocalMessage(
        "Domácí a hostující tým nemohou být stejné."
      );
      return;
    }

    if (!startsAt) {
      setLocalMessage("Vyber datum a čas zápasu.");
      return;
    }

    let parsedHomeScore: number | null = null;
    let parsedAwayScore: number | null = null;

    if (status === "finished") {
      parsedHomeScore = Number(homeScore);
      parsedAwayScore = Number(awayScore);

      if (
        !Number.isInteger(parsedHomeScore) ||
        !Number.isInteger(parsedAwayScore) ||
        parsedHomeScore < 0 ||
        parsedAwayScore < 0
      ) {
        setLocalMessage(
          "U ukončeného zápasu musí být vyplněný platný výsledek."
        );
        return;
      }
    } else if (homeScore !== "" || awayScore !== "") {
      parsedHomeScore =
        homeScore === "" ? null : Number(homeScore);
      parsedAwayScore =
        awayScore === "" ? null : Number(awayScore);

      if (
        (parsedHomeScore !== null &&
          (!Number.isInteger(parsedHomeScore) ||
            parsedHomeScore < 0)) ||
        (parsedAwayScore !== null &&
          (!Number.isInteger(parsedAwayScore) ||
            parsedAwayScore < 0))
      ) {
        setLocalMessage("Zadej platné nezáporné skóre.");
        return;
      }
    }

    await onSave({
      sportId: selectedSportId,
      competitionId: parsedCompetitionId,
      homeTeamId: parsedHomeTeamId,
      awayTeamId: parsedAwayTeamId,
      startsAt,
      status,
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

      <section className="relative z-10 max-h-full w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#101010] p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
              Administrace
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Upravit zápas
            </h2>

            <p className="mt-3 text-sm text-zinc-400">
              Změň týmy, soutěž, datum, stav nebo výsledek.
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
          className="mt-8 grid gap-5 md:grid-cols-2"
        >
          <label>
            <span className="mb-2 block text-sm font-bold">
              Sport
            </span>

            <select
              value={sportId}
              onChange={(event) =>
                handleSportChange(event.target.value)
              }
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            >
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.icon} {sport.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Soutěž
            </span>

            <select
              value={competitionId}
              onChange={(event) =>
                setCompetitionId(event.target.value)
              }
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            >
              <option value="">Vyber soutěž</option>

              {filteredCompetitions.map((competition) => (
                <option
                  key={competition.id}
                  value={competition.id}
                >
                  {formatCompetitionName(competition)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Domácí tým
            </span>

            <select
              value={homeTeamId}
              onChange={(event) =>
                setHomeTeamId(event.target.value)
              }
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            >
              <option value="">Vyber domácí tým</option>

              {filteredTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Hostující tým
            </span>

            <select
              value={awayTeamId}
              onChange={(event) =>
                setAwayTeamId(event.target.value)
              }
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            >
              <option value="">Vyber hostující tým</option>

              {filteredTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Datum a čas
            </span>

            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) =>
                setStartsAt(event.target.value)
              }
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Stav zápasu
            </span>

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as MatchStatus)
              }
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            >
              {statusOptions.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Skóre domácích
            </span>

            <input
              type="number"
              min="0"
              step="1"
              value={homeScore}
              onChange={(event) =>
                setHomeScore(event.target.value)
              }
              placeholder="Například 2"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none placeholder:text-zinc-600 focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Skóre hostů
            </span>

            <input
              type="number"
              min="0"
              step="1"
              value={awayScore}
              onChange={(event) =>
                setAwayScore(event.target.value)
              }
              placeholder="Například 1"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none placeholder:text-zinc-600 focus:border-amber-400"
            />
          </label>

          {localMessage && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300 md:col-span-2">
              {localMessage}
            </p>
          )}

          <div className="mt-2 flex flex-col-reverse gap-3 md:col-span-2 sm:flex-row sm:justify-end">
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
              {saving
                ? "Ukládám změny…"
                : "Uložit změny"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function AdminMatchesPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [competitions, setCompetitions] = useState<
    Competition[]
  >([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);

  const [sportId, setSportId] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [startsAt, setStartsAt] = useState("");

  const [resultHome, setResultHome] = useState<
    Record<number, string>
  >({});
  const [resultAway, setResultAway] = useState<
    Record<number, string>
  >({});

  const [editingMatch, setEditingMatch] =
    useState<Match | null>(null);

  const [deletingMatch, setDeletingMatch] =
    useState<Match | null>(null);

  const [message, setMessage] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingResultId, setSavingResultId] =
    useState<number | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoadingData(true);

    const [
      sportsResult,
      competitionsResult,
      teamsResult,
      matchesResult,
    ] = await Promise.all([
      supabase
        .from("sports")
        .select("id, name, icon")
        .order("name"),

      supabase
        .from("competitions")
        .select("id, sport_id, name, season")
        .order("name"),

      supabase
        .from("teams")
        .select(
          "id, sport_id, name, short_name, logo_url"
        )
        .order("name"),

      supabase
        .from("matches")
        .select(`
          id,
          sport_id,
          competition_id,
          home_team_id,
          away_team_id,
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

    if (sportsResult.error) {
      setMessage(
        `Chyba sportů: ${sportsResult.error.message}`
      );
      setLoadingData(false);
      return;
    }

    if (competitionsResult.error) {
      setMessage(
        `Chyba soutěží: ${competitionsResult.error.message}`
      );
      setLoadingData(false);
      return;
    }

    if (teamsResult.error) {
      setMessage(
        `Chyba týmů: ${teamsResult.error.message}`
      );
      setLoadingData(false);
      return;
    }

    if (matchesResult.error) {
      setMessage(
        `Chyba zápasů: ${matchesResult.error.message}`
      );
      setLoadingData(false);
      return;
    }

    const loadedSports = sportsResult.data ?? [];
    const loadedCompetitions =
      competitionsResult.data ?? [];
    const loadedTeams = teamsResult.data ?? [];
    const loadedMatches =
      (matchesResult.data as Match[] | null) ?? [];

    setSports(loadedSports);
    setCompetitions(loadedCompetitions);
    setTeams(loadedTeams);
    setMatches(loadedMatches);

    const initialHomeResults: Record<number, string> = {};
    const initialAwayResults: Record<number, string> = {};

    loadedMatches.forEach((match) => {
      if (match.home_score !== null) {
        initialHomeResults[match.id] = String(
          match.home_score
        );
      }

      if (match.away_score !== null) {
        initialAwayResults[match.id] = String(
          match.away_score
        );
      }
    });

    setResultHome(initialHomeResults);
    setResultAway(initialAwayResults);

    if (!sportId && loadedSports.length > 0) {
      setSportId(String(loadedSports[0].id));
    }

    setLoadingData(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedSportId = Number(sportId);

  const filteredCompetitions = competitions.filter(
    (competition) =>
      competition.sport_id === selectedSportId
  );

  const filteredTeams = teams.filter(
    (team) => team.sport_id === selectedSportId
  );

  function handleSportChange(value: string) {
    setSportId(value);
    setCompetitionId("");
    setHomeTeamId("");
    setAwayTeamId("");
  }

  function getTeam(teamId: number | null) {
    return (
      teams.find((team) => team.id === teamId) ?? null
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

  async function handleAddMatch(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setMessage("");

    const selectedCompetition = competitions.find(
      (competition) =>
        competition.id === Number(competitionId)
    );

    const selectedHomeTeam = teams.find(
      (team) => team.id === Number(homeTeamId)
    );

    const selectedAwayTeam = teams.find(
      (team) => team.id === Number(awayTeamId)
    );

    if (
      !selectedCompetition ||
      !selectedHomeTeam ||
      !selectedAwayTeam
    ) {
      setMessage("Vyber platnou soutěž a oba týmy.");
      return;
    }

    if (selectedHomeTeam.id === selectedAwayTeam.id) {
      setMessage(
        "Domácí a hostující tým nemohou být stejné."
      );
      return;
    }

    if (!startsAt) {
      setMessage("Vyber datum a čas zápasu.");
      return;
    }

    setCreating(true);

    const { error } = await supabase
      .from("matches")
      .insert({
        sport_id: selectedSportId,
        competition_id: selectedCompetition.id,
        home_team_id: selectedHomeTeam.id,
        away_team_id: selectedAwayTeam.id,
        competition: formatCompetitionName(
          selectedCompetition
        ),
        home_team: selectedHomeTeam.name,
        away_team: selectedAwayTeam.name,
        starts_at: new Date(startsAt).toISOString(),
        status: "scheduled",
        home_score: null,
        away_score: null,
      });

    setCreating(false);

    if (error) {
      setMessage(
        `Zápas se nepodařilo přidat: ${error.message}`
      );
      return;
    }

    setCompetitionId("");
    setHomeTeamId("");
    setAwayTeamId("");
    setStartsAt("");
    setMessage("Zápas byl úspěšně přidán.");

    await loadData();
  }

  async function handleSaveResult(matchId: number) {
    setMessage("");

    const homeScore = Number(resultHome[matchId]);
    const awayScore = Number(resultAway[matchId]);

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      setMessage("Zadej platný konečný výsledek.");
      return;
    }

    setSavingResultId(matchId);

    const { error: resultError } = await supabase
      .from("matches")
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status: "finished",
      })
      .eq("id", matchId);

    if (resultError) {
      setSavingResultId(null);
      setMessage(
        `Výsledek se nepodařilo uložit: ${resultError.message}`
      );
      return;
    }

    try {
      await evaluateMatch(matchId);

      setMessage(
        "Výsledek byl uložen a body byly automaticky přepočítány."
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nastala neznámá chyba.";

      setMessage(
        `Výsledek byl uložen, ale bodování selhalo: ${errorMessage}`
      );
    }

    setSavingResultId(null);
    await loadData();
  }

  async function handleSaveEdit(
    values: EditMatchValues
  ) {
    if (!editingMatch) {
      return;
    }

    setSavingEdit(true);
    setMessage("");

    try {
      const selectedCompetition = competitions.find(
        (competition) =>
          competition.id === values.competitionId
      );

      const selectedHomeTeam = teams.find(
        (team) => team.id === values.homeTeamId
      );

      const selectedAwayTeam = teams.find(
        (team) => team.id === values.awayTeamId
      );

      if (
        !selectedCompetition ||
        !selectedHomeTeam ||
        !selectedAwayTeam
      ) {
        throw new Error(
          "Vybraná soutěž nebo tým neexistuje."
        );
      }

      if (
        selectedHomeTeam.id === selectedAwayTeam.id
      ) {
        throw new Error(
          "Domácí a hostující tým nemohou být stejné."
        );
      }

      const { error } = await supabase
        .from("matches")
        .update({
          sport_id: values.sportId,
          competition_id: selectedCompetition.id,
          home_team_id: selectedHomeTeam.id,
          away_team_id: selectedAwayTeam.id,
          competition: formatCompetitionName(
            selectedCompetition
          ),
          home_team: selectedHomeTeam.name,
          away_team: selectedAwayTeam.name,
          starts_at: new Date(
            values.startsAt
          ).toISOString(),
          status: values.status,
          home_score: values.homeScore,
          away_score: values.awayScore,
        })
        .eq("id", editingMatch.id);

      if (error) {
        throw new Error(error.message);
      }

      if (
        values.status === "finished" &&
        values.homeScore !== null &&
        values.awayScore !== null
      ) {
        await evaluateMatch(editingMatch.id);
      }

      setEditingMatch(null);

      setMessage(
        values.status === "finished"
          ? "Zápas byl upraven a body byly přepočítány."
          : "Zápas byl úspěšně upraven."
      );

      await loadData();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nastala neznámá chyba.";

      setMessage(
        `Chyba při úpravě zápasu: ${errorMessage}`
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteMatch() {
    if (!deletingMatch) {
      return;
    }

    setDeleting(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", deletingMatch.id);

      if (error) {
        throw new Error(error.message);
      }

      setDeletingMatch(null);
      setMessage(
        "Zápas a jeho související tipy byly smazány."
      );

      await loadData();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nastala neznámá chyba.";

      setMessage(
        `Zápas se nepodařilo smazat: ${errorMessage}`
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-14">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 sm:p-10">
        <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
          Administrace
        </p>

        <h1 className="mt-3 text-4xl font-black sm:text-5xl">
          Správa zápasů
        </h1>

        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Přidej zápas výběrem sportu, soutěže a týmů
          z databáze.
        </p>

        <form
          onSubmit={handleAddMatch}
          className="mt-10 grid gap-6 md:grid-cols-2"
        >
          <label>
            <span className="mb-2 block text-sm font-bold">
              Sport
            </span>

            <select
              value={sportId}
              onChange={(event) =>
                handleSportChange(event.target.value)
              }
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            >
              {sports.map((sport) => (
                <option key={sport.id} value={sport.id}>
                  {sport.icon} {sport.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Soutěž
            </span>

            <select
              value={competitionId}
              onChange={(event) =>
                setCompetitionId(event.target.value)
              }
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            >
              <option value="">Vyber soutěž</option>

              {filteredCompetitions.map((competition) => (
                <option
                  key={competition.id}
                  value={competition.id}
                >
                  {formatCompetitionName(competition)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Domácí tým
            </span>

            <select
              value={homeTeamId}
              onChange={(event) =>
                setHomeTeamId(event.target.value)
              }
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            >
              <option value="">Vyber domácí tým</option>

              {filteredTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Hostující tým
            </span>

            <select
              value={awayTeamId}
              onChange={(event) =>
                setAwayTeamId(event.target.value)
              }
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            >
              <option value="">Vyber hostující tým</option>

              {filteredTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-bold">
              Datum a čas začátku
            </span>

            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) =>
                setStartsAt(event.target.value)
              }
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            />
          </label>

          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-amber-400 px-6 py-4 font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
          >
            {creating
              ? "Přidávám zápas…"
              : "Přidat zápas"}
          </button>
        </form>

        {message && (
          <p className="mt-6 rounded-xl border border-white/10 bg-black p-4 text-center text-sm text-zinc-300">
            {message}
          </p>
        )}
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 sm:p-10">
        <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
          Databáze
        </p>

        <h2 className="mt-2 text-3xl font-black">
          Všechny zápasy
        </h2>

        {loadingData ? (
          <p className="mt-6 text-zinc-400">
            Načítám zápasy…
          </p>
        ) : matches.length === 0 ? (
          <p className="mt-6 text-zinc-400">
            Zatím nebyl přidán žádný zápas.
          </p>
        ) : (
          <div className="mt-8 grid gap-5">
            {matches.map((match) => {
              const homeTeam = getTeam(
                match.home_team_id
              );
              const awayTeam = getTeam(
                match.away_team_id
              );
              const kickoff = new Date(match.starts_at);

              return (
                <article
                  key={match.id}
                  className="rounded-2xl border border-white/10 bg-black p-5 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                        {match.competition}
                      </p>

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
                    </div>

                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${getStatusClasses(
                        match.status
                      )}`}
                    >
                      {formatStatus(match.status)}
                    </span>
                  </div>

                  <div className="mt-7 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                    <div className="flex flex-col items-center text-center">
                      {homeTeam?.logo_url && (
                        <Image
                          src={homeTeam.logo_url}
                          alt={homeTeam.name}
                          width={64}
                          height={64}
                          className="mb-3 h-16 w-16 object-contain"
                        />
                      )}

                      <p className="font-black">
                        {homeTeam?.name ??
                          match.home_team}
                      </p>
                    </div>

                    <div className="text-center">
                      {match.home_score !== null &&
                      match.away_score !== null ? (
                        <p className="text-2xl font-black text-amber-400">
                          {match.home_score} :{" "}
                          {match.away_score}
                        </p>
                      ) : (
                        <p className="text-sm font-black text-zinc-600">
                          VS
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-center text-center">
                      {awayTeam?.logo_url && (
                        <Image
                          src={awayTeam.logo_url}
                          alt={awayTeam.name}
                          width={64}
                          height={64}
                          className="mb-3 h-16 w-16 object-contain"
                        />
                      )}

                      <p className="font-black">
                        {awayTeam?.name ??
                          match.away_team}
                      </p>
                    </div>
                  </div>

                  <div className="mt-7 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.025] p-5 md:grid-cols-[1fr_auto_1fr_auto] md:items-center">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={
                        resultHome[match.id] ?? ""
                      }
                      onChange={(event) =>
                        setResultHome((current) => ({
                          ...current,
                          [match.id]:
                            event.target.value,
                        }))
                      }
                      placeholder="Domácí"
                      className="min-w-0 rounded-xl border border-white/10 bg-black px-4 py-3 text-center font-black outline-none focus:border-amber-400"
                    />

                    <span className="hidden font-black text-zinc-600 md:block">
                      :
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={
                        resultAway[match.id] ?? ""
                      }
                      onChange={(event) =>
                        setResultAway((current) => ({
                          ...current,
                          [match.id]:
                            event.target.value,
                        }))
                      }
                      placeholder="Hosté"
                      className="min-w-0 rounded-xl border border-white/10 bg-black px-4 py-3 text-center font-black outline-none focus:border-amber-400"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        handleSaveResult(match.id)
                      }
                      disabled={
                        savingResultId === match.id
                      }
                      className="rounded-xl bg-amber-400 px-5 py-3 font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingResultId === match.id
                        ? "Ukládám…"
                        : "Uložit výsledek"}
                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingMatch(match)
                      }
                      className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-300 transition hover:bg-amber-400 hover:text-black"
                    >
                      ✏️ Upravit zápas
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDeletingMatch(match)
                      }
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-500 hover:text-white"
                    >
                      🗑️ Smazat zápas
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <EditMatchModal
        match={editingMatch}
        sports={sports}
        competitions={competitions}
        teams={teams}
        saving={savingEdit}
        onClose={() => {
          if (!savingEdit) {
            setEditingMatch(null);
          }
        }}
        onSave={handleSaveEdit}
      />

      <DeleteDialog
        open={deletingMatch !== null}
        title="Smazat zápas?"
        description={
          deletingMatch
            ? `Opravdu chceš smazat zápas ${deletingMatch.home_team} – ${deletingMatch.away_team}? Smažou se také všechny tipy a body spojené s tímto zápasem.`
            : ""
        }
        deleting={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeletingMatch(null);
          }
        }}
        onConfirm={handleDeleteMatch}
      />
    </main>
  );
}