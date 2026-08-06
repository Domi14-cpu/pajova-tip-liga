"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";

export type EditableTeam = {
  id: number;
  sport_id: number;
  name: string;
  short_name: string | null;
  team_type: "club" | "national";
  country_code: string | null;
  logo_url: string | null;
};

type Sport = {
  id: number;
  name: string;
  icon: string | null;
};

type EditTeamModalProps = {
  open: boolean;
  team: EditableTeam | null;
  sports: Sport[];
  saving?: boolean;
  onClose: () => void;
  onSave: (values: {
    sportId: number;
    name: string;
    shortName: string | null;
    teamType: "club" | "national";
    countryCode: string | null;
    newLogo: File | null;
  }) => Promise<void>;
};

export default function EditTeamModal({
  open,
  team,
  sports,
  saving = false,
  onClose,
  onSave,
}: EditTeamModalProps) {
  const [sportId, setSportId] = useState("");
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [teamType, setTeamType] =
    useState<"club" | "national">("club");
  const [countryCode, setCountryCode] = useState("");
  const [newLogo, setNewLogo] = useState<File | null>(null);

  useEffect(() => {
    if (!team) {
      return;
    }

    setSportId(String(team.sport_id));
    setName(team.name);
    setShortName(team.short_name ?? "");
    setTeamType(team.team_type);
    setCountryCode(team.country_code ?? "");
    setNewLogo(null);
  }, [team]);

  if (!open || !team) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSave({
      sportId: Number(sportId),
      name: name.trim(),
      shortName: shortName.trim() || null,
      teamType,
      countryCode: countryCode.trim().toUpperCase() || null,
      newLogo,
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-sm">
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
              Upravit tým
            </h2>

            <p className="mt-3 text-sm text-zinc-400">
              Změň údaje týmu a potvrď uložení.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-xl font-black text-zinc-400 transition hover:border-amber-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="mt-7 flex items-center gap-4 rounded-2xl border border-white/10 bg-black p-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            {team.logo_url ? (
              <Image
                src={team.logo_url}
                alt={team.name}
                width={80}
                height={80}
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <span className="text-3xl">🏆</span>
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-xl font-black">
              {team.name}
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              ID týmu: {team.id}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-7 grid gap-5 md:grid-cols-2"
        >
          <label>
            <span className="mb-2 block text-sm font-bold">
              Sport
            </span>

            <select
              value={sportId}
              onChange={(event) => setSportId(event.target.value)}
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
                  event.target.value as "club" | "national"
                )
              }
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            >
              <option value="club">Klub</option>
              <option value="national">Národní tým</option>
            </select>
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Oficiální název
            </span>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Krátký název
            </span>

            <input
              value={shortName}
              onChange={(event) => setShortName(event.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Kód země
            </span>

            <input
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value)}
              maxLength={3}
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 uppercase outline-none focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Nové logo
            </span>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(event) =>
                setNewLogo(event.target.files?.[0] ?? null)
              }
              className="block w-full rounded-xl border border-white/10 bg-black px-4 py-3 text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-400 file:px-4 file:py-2 file:font-black file:text-black"
            />

            <p className="mt-2 text-xs text-zinc-500">
              Když nic nevybereš, současné logo zůstane.
            </p>
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
              {saving ? "Ukládám změny…" : "Uložit změny"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}