"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import DeleteDialog from "@/components/admin/DeleteDialog";
import EditTeamModal, {
  type EditableTeam,
} from "@/components/admin/EditTeamModal";
import { supabase } from "@/lib/supabase";

type Sport = {
  id: number;
  name: string;
  icon: string | null;
};

type Team = EditableTeam & {
  sports: {
    name: string;
    icon: string | null;
  }[];
};

type EditValues = {
  sportId: number;
  name: string;
  shortName: string | null;
  teamType: "club" | "national";
  countryCode: string | null;
  newLogo: File | null;
};

const allowedExtensions = ["png", "jpg", "jpeg", "webp", "svg"];

function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminTeamsPage() {
  const [sports, setSports] = useState<Sport[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [sportId, setSportId] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [teamType, setTeamType] =
    useState<"club" | "national">("club");
  const [countryCode, setCountryCode] = useState("");
  const [logo, setLogo] = useState<File | null>(null);

  const [editingTeam, setEditingTeam] =
    useState<EditableTeam | null>(null);

  const [deletingTeam, setDeletingTeam] =
    useState<EditableTeam | null>(null);

  const [message, setMessage] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    setLoadingData(true);

    const [sportsResult, teamsResult] = await Promise.all([
      supabase
        .from("sports")
        .select("id, name, icon")
        .order("name"),

      supabase
        .from("teams")
        .select(`
          id,
          sport_id,
          name,
          short_name,
          team_type,
          country_code,
          logo_url,
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

    if (teamsResult.error) {
      setMessage(
        `Chyba při načítání týmů: ${teamsResult.error.message}`
      );
      setLoadingData(false);
      return;
    }

    const loadedSports = sportsResult.data ?? [];
    const loadedTeams =
      (teamsResult.data as Team[] | null) ?? [];

    setSports(loadedSports);
    setTeams(loadedTeams);

    if (!sportId && loadedSports.length > 0) {
      setSportId(String(loadedSports[0].id));
    }

    setLoadingData(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function uploadLogo(
    file: File,
    selectedSportId: number,
    slug: string
  ) {
    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (!extension) {
      throw new Error("Logo nemá platnou příponu.");
    }

    if (!allowedExtensions.includes(extension)) {
      throw new Error(
        "Logo musí být PNG, JPG, JPEG, WebP nebo SVG."
      );
    }

    const filePath =
      `${selectedSportId}/${slug}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("team-logos")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(
        `Nahrání loga selhalo: ${uploadError.message}`
      );
    }

    const { data } = supabase.storage
      .from("team-logos")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  function clearCreateForm() {
    setName("");
    setShortName("");
    setCountryCode("");
    setTeamType("club");
    setLogo(null);

    const fileInput = document.getElementById(
      "team-logo"
    ) as HTMLInputElement | null;

    if (fileInput) {
      fileInput.value = "";
    }
  }

  async function handleCreateTeam(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setCreating(true);
    setMessage("");

    try {
      const trimmedName = name.trim();
      const slug = createSlug(trimmedName);

      if (!sportId) {
        throw new Error("Vyber sport.");
      }

      if (!slug) {
        throw new Error("Název týmu není platný.");
      }

      let logoUrl: string | null = null;

      if (logo) {
        logoUrl = await uploadLogo(
          logo,
          Number(sportId),
          slug
        );
      }

      const { error } = await supabase
        .from("teams")
        .insert({
          sport_id: Number(sportId),
          name: trimmedName,
          short_name: shortName.trim() || null,
          slug,
          team_type: teamType,
          country_code:
            countryCode.trim().toUpperCase() || null,
          logo_url: logoUrl,
        });

      if (error) {
        throw new Error(error.message);
      }

      clearCreateForm();
      setMessage("Tým byl úspěšně přidán.");
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

  async function handleSaveEdit(values: EditValues) {
    if (!editingTeam) {
      return;
    }

    setSavingEdit(true);
    setMessage("");

    try {
      const trimmedName = values.name.trim();
      const slug = createSlug(trimmedName);

      if (!slug) {
        throw new Error("Název týmu není platný.");
      }

      let logoUrl = editingTeam.logo_url;

      if (values.newLogo) {
        logoUrl = await uploadLogo(
          values.newLogo,
          values.sportId,
          slug
        );
      }

      const { error } = await supabase
        .from("teams")
        .update({
          sport_id: values.sportId,
          name: trimmedName,
          short_name: values.shortName,
          slug,
          team_type: values.teamType,
          country_code: values.countryCode,
          logo_url: logoUrl,
        })
        .eq("id", editingTeam.id);

      if (error) {
        throw new Error(error.message);
      }

      setEditingTeam(null);
      setMessage("Změny týmu byly úspěšně uloženy.");
      await loadData();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nastala neznámá chyba.";

      setMessage(`Chyba při úpravě: ${errorMessage}`);
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteTeam() {
    if (!deletingTeam) {
      return;
    }

    setDeleting(true);
    setMessage("");

    try {
      const { data: usedMatches, error: checkError } =
        await supabase
          .from("matches")
          .select("id")
          .or(
            `home_team_id.eq.${deletingTeam.id},away_team_id.eq.${deletingTeam.id}`
          )
          .limit(1);

      if (checkError) {
        throw new Error(checkError.message);
      }

      if (usedMatches && usedMatches.length > 0) {
        throw new Error(
          "Tým nejde smazat, protože je použitý v některém zápase."
        );
      }

      const { error: deleteError } = await supabase
        .from("teams")
        .delete()
        .eq("id", deletingTeam.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      setDeletingTeam(null);
      setMessage("Tým byl úspěšně smazán.");
      await loadData();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nastala neznámá chyba.";

      setMessage(`Chyba při mazání: ${errorMessage}`);
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
          Kluby a národní týmy
        </h1>

        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Přidej klub nebo reprezentaci. Potom bude tým
          dostupný při vytváření zápasů.
        </p>

        <form
          onSubmit={handleCreateTeam}
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
              Typ týmu
            </span>

            <select
              value={teamType}
              onChange={(event) =>
                setTeamType(
                  event.target.value as
                    | "club"
                    | "national"
                )
              }
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            >
              <option value="club">Klub</option>
              <option value="national">
                Národní tým
              </option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Oficiální název
            </span>

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              placeholder={
                teamType === "national"
                  ? "Například Česko"
                  : "Například SK Slavia Praha"
              }
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none placeholder:text-zinc-600 focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Krátký název
            </span>

            <input
              value={shortName}
              onChange={(event) =>
                setShortName(event.target.value)
              }
              placeholder={
                teamType === "national"
                  ? "Například Česko"
                  : "Například Slavia"
              }
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none placeholder:text-zinc-600 focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Kód země
            </span>

            <input
              value={countryCode}
              onChange={(event) =>
                setCountryCode(event.target.value)
              }
              required
              maxLength={3}
              placeholder="Například CZ, SK, DE"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 uppercase outline-none placeholder:normal-case placeholder:text-zinc-600 focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Logo nebo znak
            </span>

            <input
              id="team-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(event) =>
                setLogo(event.target.files?.[0] ?? null)
              }
              className="block w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-400 file:px-4 file:py-2 file:font-black file:text-black"
            />

            <p className="mt-2 text-xs text-zinc-500">
              Doporučené je čtvercové PNG nebo WebP.
            </p>
          </label>

          <button
            type="submit"
            disabled={creating}
            className="rounded-xl bg-amber-400 px-6 py-4 font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
          >
            {creating
              ? "Ukládám tým…"
              : "Přidat tým"}
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
          Přidané týmy
        </h2>

        {loadingData ? (
          <p className="mt-6 text-zinc-400">
            Načítám týmy…
          </p>
        ) : teams.length === 0 ? (
          <p className="mt-6 text-zinc-400">
            Zatím nebyl přidán žádný tým.
          </p>
        ) : (
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <article
                key={team.id}
                className="rounded-2xl border border-white/10 bg-black p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                    {team.logo_url ? (
                      <Image
                        src={team.logo_url}
                        alt={team.name}
                        width={64}
                        height={64}
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <span className="text-2xl">
                        {team.sports?.[0]?.icon ?? "🏆"}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-lg font-black">
                      {team.name}
                    </p>

                    <p className="mt-1 text-sm text-zinc-500">
                      {team.sports?.[0]?.icon}{" "}
                      {team.sports?.[0]?.name}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
                    {team.team_type === "club"
                      ? "Klub"
                      : "Národní tým"}
                  </span>

                  {team.country_code && (
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-bold text-zinc-400">
                      {team.country_code}
                    </span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingTeam(team)}
                    className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-300 transition hover:bg-amber-400 hover:text-black"
                  >
                    ✏️ Upravit
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingTeam(team)}
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

      <EditTeamModal
        open={editingTeam !== null}
        team={editingTeam}
        sports={sports}
        saving={savingEdit}
        onClose={() => {
          if (!savingEdit) {
            setEditingTeam(null);
          }
        }}
        onSave={handleSaveEdit}
      />

      <DeleteDialog
        open={deletingTeam !== null}
        title="Smazat tým?"
        description={
          deletingTeam
            ? `Opravdu chceš smazat tým ${deletingTeam.name}? Tuto akci nelze vrátit zpět.`
            : ""
        }
        deleting={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeletingTeam(null);
          }
        }}
        onConfirm={handleDeleteTeam}
      />
    </main>
  );
}