"use client";

import { FormEvent, useEffect, useState } from "react";
import DeleteDialog from "@/components/admin/DeleteDialog";
import { supabase } from "@/lib/supabase";

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
  competition_type: string;
  country_code: string | null;
  sports: {
    name: string;
    icon: string | null;
  }[];
};

type CompetitionFormValues = {
  sportId: number;
  name: string;
  season: string | null;
  competitionType: string;
  countryCode: string | null;
};

type EditCompetitionModalProps = {
  competition: Competition | null;
  sports: Sport[];
  saving: boolean;
  onClose: () => void;
  onSave: (values: CompetitionFormValues) => Promise<void>;
};

const competitionTypes = [
  { value: "league", label: "Liga" },
  { value: "cup", label: "Pohár" },
  { value: "world_championship", label: "Mistrovství světa" },
  { value: "european_championship", label: "Mistrovství Evropy" },
  { value: "qualification", label: "Kvalifikace" },
  { value: "friendly", label: "Přátelská soutěž" },
  { value: "olympics", label: "Olympijské hry" },
  { value: "other", label: "Jiná soutěž" },
];

function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getCompetitionTypeLabel(value: string) {
  return (
    competitionTypes.find((type) => type.value === value)?.label ??
    value
  );
}

function EditCompetitionModal({
  competition,
  sports,
  saving,
  onClose,
  onSave,
}: EditCompetitionModalProps) {
  const [sportId, setSportId] = useState("");
  const [name, setName] = useState("");
  const [season, setSeason] = useState("");
  const [competitionType, setCompetitionType] =
    useState("league");
  const [countryCode, setCountryCode] = useState("");

  useEffect(() => {
    if (!competition) {
      return;
    }

    setSportId(String(competition.sport_id));
    setName(competition.name);
    setSeason(competition.season ?? "");
    setCompetitionType(competition.competition_type);
    setCountryCode(competition.country_code ?? "");
  }, [competition]);

  if (!competition) {
    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    await onSave({
      sportId: Number(sportId),
      name: name.trim(),
      season: season.trim() || null,
      competitionType,
      countryCode:
        countryCode.trim().toUpperCase() || null,
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

      <section className="relative z-10 max-h-full w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#101010] p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
              Administrace
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Upravit soutěž
            </h2>

            <p className="mt-3 text-sm text-zinc-400">
              Změň údaje soutěže a ulož je.
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
                setSportId(event.target.value)
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
              Název soutěže
            </span>

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Sezóna / ročník
            </span>

            <input
              value={season}
              onChange={(event) =>
                setSeason(event.target.value)
              }
              placeholder="Například 2028 nebo 2026/27"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none placeholder:text-zinc-600 focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Typ soutěže
            </span>

            <select
              value={competitionType}
              onChange={(event) =>
                setCompetitionType(event.target.value)
              }
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            >
              {competitionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-bold">
              Kód země pořadatele
            </span>

            <input
              value={countryCode}
              onChange={(event) =>
                setCountryCode(event.target.value)
              }
              maxLength={3}
              placeholder="Například CZ nebo prázdné"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 uppercase outline-none placeholder:normal-case placeholder:text-zinc-600 focus:border-amber-400"
            />
          </label>

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

export default function AdminCompetitionsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [competitions, setCompetitions] = useState<
    Competition[]
  >([]);

  const [sportId, setSportId] = useState("");
  const [name, setName] = useState("");
  const [season, setSeason] = useState("");
  const [competitionType, setCompetitionType] =
    useState("league");
  const [countryCode, setCountryCode] = useState("");

  const [editingCompetition, setEditingCompetition] =
    useState<Competition | null>(null);

  const [deletingCompetition, setDeletingCompetition] =
    useState<Competition | null>(null);

  const [message, setMessage] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoadingData(true);

    const [sportsResult, competitionsResult] =
      await Promise.all([
        supabase
          .from("sports")
          .select("id, name, icon")
          .order("name"),

        supabase
          .from("competitions")
          .select(`
            id,
            sport_id,
            name,
            season,
            competition_type,
            country_code,
            sports (
              name,
              icon
            )
          `)
          .order("name"),
      ]);

    if (sportsResult.error) {
      setMessage(
        `Chyba při načítání sportů: ${sportsResult.error.message}`
      );
      setLoadingData(false);
      return;
    }

    if (competitionsResult.error) {
      setMessage(
        `Chyba při načítání soutěží: ${competitionsResult.error.message}`
      );
      setLoadingData(false);
      return;
    }

    const loadedSports = sportsResult.data ?? [];

    setSports(loadedSports);
    setCompetitions(
      (competitionsResult.data as Competition[] | null) ??
        []
    );

    if (!sportId && loadedSports.length > 0) {
      setSportId(String(loadedSports[0].id));
    }

    setLoadingData(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreateCompetition(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setCreating(true);
    setMessage("");

    try {
      const trimmedName = name.trim();
      const trimmedSeason = season.trim();
      const baseSlug = createSlug(trimmedName);

      if (!sportId) {
        throw new Error("Vyber sport.");
      }

      if (!baseSlug) {
        throw new Error(
          "Název soutěže není platný."
        );
      }

      const slug = trimmedSeason
        ? `${baseSlug}-${createSlug(trimmedSeason)}`
        : baseSlug;

      const { error } = await supabase
        .from("competitions")
        .insert({
          sport_id: Number(sportId),
          name: trimmedName,
          slug,
          season: trimmedSeason || null,
          competition_type: competitionType,
          country_code:
            countryCode.trim().toUpperCase() || null,
        });

      if (error) {
        throw new Error(error.message);
      }

      setName("");
      setSeason("");
      setCountryCode("");
      setCompetitionType("league");
      setMessage(
        "Soutěž byla úspěšně přidána."
      );

      await loadData();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nastala neznámá chyba.";

      setMessage(`Chyba: ${errorMessage}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(
    values: CompetitionFormValues
  ) {
    if (!editingCompetition) {
      return;
    }

    setSavingEdit(true);
    setMessage("");

    try {
      const baseSlug = createSlug(values.name);

      if (!baseSlug) {
        throw new Error(
          "Název soutěže není platný."
        );
      }

      const slug = values.season
        ? `${baseSlug}-${createSlug(values.season)}`
        : baseSlug;

      const { error } = await supabase
        .from("competitions")
        .update({
          sport_id: values.sportId,
          name: values.name,
          slug,
          season: values.season,
          competition_type: values.competitionType,
          country_code: values.countryCode,
        })
        .eq("id", editingCompetition.id);

      if (error) {
        throw new Error(error.message);
      }

      setEditingCompetition(null);
      setMessage(
        "Změny soutěže byly úspěšně uloženy."
      );

      await loadData();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nastala neznámá chyba.";

      setMessage(
        `Chyba při úpravě: ${errorMessage}`
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteCompetition() {
    if (!deletingCompetition) {
      return;
    }

    setDeleting(true);
    setMessage("");

    try {
      const { data: usedMatches, error: checkError } =
        await supabase
          .from("matches")
          .select("id")
          .eq(
            "competition_id",
            deletingCompetition.id
          )
          .limit(1);

      if (checkError) {
        throw new Error(checkError.message);
      }

      if (usedMatches && usedMatches.length > 0) {
        throw new Error(
          "Soutěž nejde smazat, protože je použitá alespoň v jednom zápase."
        );
      }

      const { error: deleteError } = await supabase
        .from("competitions")
        .delete()
        .eq("id", deletingCompetition.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setDeletingCompetition(null);
      setMessage(
        "Soutěž byla úspěšně smazána."
      );

      await loadData();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nastala neznámá chyba.";

      setMessage(
        `Chyba při mazání: ${errorMessage}`
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-5 py-14">
      <section className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 sm:p-10">
        <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
          Administrace
        </p>

        <h1 className="mt-3 text-4xl font-black sm:text-5xl">
          Soutěže
        </h1>

        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Přidej ligu, pohár, EURO, mistrovství
          světa nebo jinou soutěž.
        </p>

        <form
          onSubmit={handleCreateCompetition}
          className="mt-10 grid gap-6 md:grid-cols-2"
        >
          <label>
            <span className="mb-2 block text-sm font-bold">
              Sport
            </span>

            <select
              value={sportId}
              onChange={(event) =>
                setSportId(event.target.value)
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
              Název soutěže
            </span>

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              placeholder="Například EURO"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none placeholder:text-zinc-600 focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Sezóna / ročník
            </span>

            <input
              value={season}
              onChange={(event) =>
                setSeason(event.target.value)
              }
              placeholder="Například 2028 nebo 2026/27"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none placeholder:text-zinc-600 focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Typ soutěže
            </span>

            <select
              value={competitionType}
              onChange={(event) =>
                setCompetitionType(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            >
              {competitionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-bold">
              Kód země pořadatele
            </span>

            <input
              value={countryCode}
              onChange={(event) =>
                setCountryCode(event.target.value)
              }
              maxLength={3}
              placeholder="Například CZ nebo prázdné pro mezinárodní soutěž"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 uppercase outline-none placeholder:normal-case placeholder:text-zinc-600 focus:border-amber-400"
            />
          </label>

          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-amber-400 px-6 py-4 font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
          >
            {creating
              ? "Ukládám soutěž…"
              : "Přidat soutěž"}
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

        <h2 className="mt-2 text-2xl font-black">
          Přidané soutěže
        </h2>

        {loadingData ? (
          <p className="mt-6 text-zinc-400">
            Načítám soutěže…
          </p>
        ) : competitions.length === 0 ? (
          <p className="mt-6 text-zinc-400">
            Zatím nebyla přidána žádná soutěž.
          </p>
        ) : (
          <div className="mt-7 grid gap-4">
            {competitions.map((competition) => (
              <article
                key={competition.id}
                className="rounded-2xl border border-white/10 bg-black p-5"
              >
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                      {competition.sports?.[0]?.icon}{" "}
                      {competition.sports?.[0]?.name}
                    </p>

                    <h3 className="mt-2 text-lg font-black">
                      {competition.name}
                      {competition.season
                        ? ` ${competition.season}`
                        : ""}
                    </h3>

                    {competition.country_code && (
                      <p className="mt-2 text-sm font-bold text-zinc-500">
                        Země: {competition.country_code}
                      </p>
                    )}
                  </div>

                  <span className="w-fit rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
                    {getCompetitionTypeLabel(
                      competition.competition_type
                    )}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingCompetition(competition)
                    }
                    className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-300 transition hover:bg-amber-400 hover:text-black"
                  >
                    ✏️ Upravit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDeletingCompetition(competition)
                    }
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-black text-red-300 transition hover:bg-red-500 hover:text-white"
                  >
                    🗑️ Smazat
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <EditCompetitionModal
        competition={editingCompetition}
        sports={sports}
        saving={savingEdit}
        onClose={() => {
          if (!savingEdit) {
            setEditingCompetition(null);
          }
        }}
        onSave={handleSaveEdit}
      />

      <DeleteDialog
        open={deletingCompetition !== null}
        title="Smazat soutěž?"
        description={
          deletingCompetition
            ? `Opravdu chceš smazat soutěž ${deletingCompetition.name}${
                deletingCompetition.season
                  ? ` ${deletingCompetition.season}`
                  : ""
              }? Tuto akci nelze vrátit zpět.`
            : ""
        }
        deleting={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeletingCompetition(null);
          }
        }}
        onConfirm={handleDeleteCompetition}
      />
    </main>
  );
}