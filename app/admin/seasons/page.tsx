"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Season = {
  id: string;
  name: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  is_private: boolean;
  is_active: boolean;
};

export default function AdminSeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);

  // Vytváření
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  // Úprava
  const [editingSeasonId, setEditingSeasonId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt, setEditEndsAt] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editAccessCode, setEditAccessCode] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingSeasonId, setDeletingSeasonId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function loadSeasons() {
    setLoading(true);

    const { data, error } = await supabase
      .from("seasons")
      .select(
        "id, name, description, starts_at, ends_at, is_private, is_active"
      )
      .order("starts_at", { ascending: false });

    if (error) {
      setMessage(`Sezóny se nepodařilo načíst: ${error.message}`);
    } else {
      setSeasons((data as Season[] | null) ?? []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSeasons();
  }, []);

  function resetEditForm() {
    setEditingSeasonId(null);
    setEditName("");
    setEditDescription("");
    setEditStartsAt("");
    setEditEndsAt("");
    setEditIsPrivate(false);
    setEditAccessCode("");
  }

  function startEditing(season: Season) {
    setMessage("");

    setEditingSeasonId(season.id);
    setEditName(season.name);
    setEditDescription(season.description ?? "");
    setEditStartsAt(season.starts_at ?? "");
    setEditEndsAt(season.ends_at ?? "");
    setEditIsPrivate(season.is_private);
    setEditAccessCode("");

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth",
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (isPrivate && !accessCode.trim()) {
      setMessage("Pro zamknutou sezónu zadej přístupový kód.");
      return;
    }

    setSaving(true);

    const { data: seasonId, error } = await supabase.rpc("create_season", {
      p_name: name,
      p_description: description,
      p_starts_at: startsAt || null,
      p_ends_at: endsAt || null,
      p_is_private: isPrivate,
      p_access_code: isPrivate ? accessCode : null,
    });

    if (error || !seasonId) {
      setMessage(
        `Sezónu se nepodařilo vytvořit: ${
          error?.message ?? "Neznámá chyba."
        }`
      );
      setSaving(false);
      return;
    }

    const { error: activateError } = await supabase
      .from("seasons")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", seasonId);

    if (activateError) {
      setMessage(
        `Sezóna vznikla, ale nepodařilo se ji aktivovat: ${activateError.message}`
      );
    } else {
      setName("");
      setDescription("");
      setStartsAt("");
      setEndsAt("");
      setIsPrivate(false);
      setAccessCode("");

      setMessage("Sezóna byla vytvořena a je aktivní.");

      await loadSeasons();
    }

    setSaving(false);
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingSeasonId) return;

    setMessage("");

    if (editIsPrivate && !editAccessCode.trim()) {
      const currentSeason = seasons.find(
        (season) => season.id === editingSeasonId
      );

      if (!currentSeason?.is_private) {
        setMessage(
          "Pro nově zamknutou sezónu musíš zadat přístupový kód."
        );
        return;
      }
    }

    setSaving(true);

    const { error } = await supabase.rpc("update_season", {
      p_season_id: editingSeasonId,
      p_name: editName,
      p_description: editDescription,
      p_starts_at: editStartsAt || null,
      p_ends_at: editEndsAt || null,
      p_is_private: editIsPrivate,
      p_access_code: editAccessCode.trim() || null,
    });

    if (error) {
      setMessage(`Sezónu se nepodařilo upravit: ${error.message}`);
      setSaving(false);
      return;
    }

    resetEditForm();
    setMessage("Sezóna byla úspěšně upravena.");

    await loadSeasons();

    setSaving(false);
  }

  async function handleDelete(season: Season) {
    const confirmed = window.confirm(
      `Opravdu chceš smazat sezónu „${season.name}“?\n\nTato akce je nevratná.`
    );

    if (!confirmed) return;

    setMessage("");
    setDeletingSeasonId(season.id);

    const { error } = await supabase.rpc("delete_season", {
      p_season_id: season.id,
    });

    if (error) {
      setMessage(`Sezónu se nepodařilo smazat: ${error.message}`);
      setDeletingSeasonId(null);
      return;
    }

    if (editingSeasonId === season.id) {
      resetEditForm();
    }

    setMessage(`Sezóna „${season.name}“ byla smazána.`);

    await loadSeasons();

    setDeletingSeasonId(null);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-14 pb-28 lg:pb-14">
      {/* HLAVIČKA */}
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-7 sm:p-10">
        <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
          Administrace
        </p>

        <h1 className="mt-3 text-4xl font-black sm:text-5xl">
          Sezóny
        </h1>

        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
          Vytvářej veřejné sezóny pro všechny tipéry nebo zamknuté sezóny
          s vlastním kódem. Sezóny může upravovat a mazat pouze
          administrátor.
        </p>
      </section>

      {/* VYTVOŘIT SEZÓNU */}
      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
        <h2 className="text-2xl font-black">Vytvořit sezónu</h2>

        <form
          onSubmit={handleSubmit}
          className="mt-7 grid gap-5 md:grid-cols-2"
        >
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-bold">
              Název sezóny
            </span>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Např. Parta z Ústí 2026"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-2 block text-sm font-bold">
              Popis (volitelné)
            </span>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Začátek
            </span>

            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Konec
            </span>

            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/40 p-4 md:col-span-2">
            <span>
              <span className="block font-black">
                🔒 Zamknutá sezóna
              </span>

              <span className="mt-1 block text-sm text-zinc-500">
                Připojení bude možné jen po zadání kódu.
              </span>
            </span>

            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-5 w-5 accent-amber-400"
            />
          </label>

          {isPrivate && (
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm font-bold">
                Přístupový kód
              </span>

              <input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
              />
            </label>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-amber-400 px-6 py-4 font-black text-black transition hover:bg-amber-300 disabled:opacity-50 md:col-span-2"
          >
            {saving ? "Vytvářím sezónu…" : "Vytvořit sezónu"}
          </button>
        </form>

        {message && (
          <p className="mt-5 rounded-xl border border-white/10 bg-black p-4 text-sm text-zinc-300">
            {message}
          </p>
        )}
      </section>

      {/* EXISTUJÍCÍ SEZÓNY */}
      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-black">
              Existující sezóny
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Správa vytvořených sezón
            </p>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-zinc-400">
            Načítám sezóny…
          </p>
        ) : seasons.length === 0 ? (
          <p className="mt-6 rounded-xl border border-white/10 bg-black/30 p-5 text-zinc-400">
            Zatím nebyla vytvořena žádná sezóna.
          </p>
        ) : (
          <div className="mt-6 grid gap-4">
            {seasons.map((season) => (
              <article
                key={season.id}
                className="rounded-2xl border border-white/10 bg-black/30 p-5"
              >
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-black">
                        {season.is_private ? "🔒 " : "🌍 "}
                        {season.name}
                      </p>

                      <span
                        className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ${
                          season.is_active
                            ? "bg-green-500/10 text-green-300"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {season.is_active
                          ? "Aktivní"
                          : "Neaktivní"}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-zinc-500">
                      {season.description || "Bez popisu"}
                    </p>

                    {(season.starts_at || season.ends_at) && (
                      <p className="mt-2 text-xs font-bold text-zinc-600">
                        {season.starts_at
                          ? `Od ${season.starts_at}`
                          : ""}
                        {season.starts_at && season.ends_at
                          ? " • "
                          : ""}
                        {season.ends_at
                          ? `Do ${season.ends_at}`
                          : ""}
                      </p>
                    )}
                  </div>

                  {/* AKCE */}
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => startEditing(season)}
                      className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-3 font-black text-amber-300 transition hover:bg-amber-400/20"
                    >
                      ✏️ Upravit
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(season)}
                      disabled={deletingSeasonId === season.id}
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-black text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                    >
                      {deletingSeasonId === season.id
                        ? "Mažu…"
                        : "🗑️ Smazat"}
                    </button>
                  </div>
                </div>

                {/* EDITACE */}
                {editingSeasonId === season.id && (
                  <form
                    onSubmit={handleUpdate}
                    className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.03] p-5"
                  >
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="font-black text-amber-300">
                          ✏️ Upravit sezónu
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          {season.name}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={resetEditForm}
                        className="rounded-lg px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
                      >
                        Zrušit
                      </button>
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <label className="md:col-span-2">
                        <span className="mb-2 block text-sm font-bold">
                          Název sezóny
                        </span>

                        <input
                          value={editName}
                          onChange={(e) =>
                            setEditName(e.target.value)
                          }
                          required
                          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
                        />
                      </label>

                      <label className="md:col-span-2">
                        <span className="mb-2 block text-sm font-bold">
                          Popis
                        </span>

                        <textarea
                          value={editDescription}
                          onChange={(e) =>
                            setEditDescription(e.target.value)
                          }
                          rows={3}
                          className="w-full resize-none rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
                        />
                      </label>

                      <label>
                        <span className="mb-2 block text-sm font-bold">
                          Začátek
                        </span>

                        <input
                          type="date"
                          value={editStartsAt}
                          onChange={(e) =>
                            setEditStartsAt(e.target.value)
                          }
                          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
                        />
                      </label>

                      <label>
                        <span className="mb-2 block text-sm font-bold">
                          Konec
                        </span>

                        <input
                          type="date"
                          value={editEndsAt}
                          onChange={(e) =>
                            setEditEndsAt(e.target.value)
                          }
                          className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
                        />
                      </label>

                      <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/40 p-4 md:col-span-2">
                        <span>
                          <span className="block font-black">
                            🔒 Zamknutá sezóna
                          </span>

                          <span className="mt-1 block text-sm text-zinc-500">
                            Vypnutím sezóna nebude vyžadovat přístupový
                            kód.
                          </span>
                        </span>

                        <input
                          type="checkbox"
                          checked={editIsPrivate}
                          onChange={(e) =>
                            setEditIsPrivate(e.target.checked)
                          }
                          className="h-5 w-5 accent-amber-400"
                        />
                      </label>

                      {editIsPrivate && (
                        <label className="md:col-span-2">
                          <span className="mb-2 block text-sm font-bold">
                            Nový přístupový kód
                          </span>

                          <input
                            type="password"
                            value={editAccessCode}
                            onChange={(e) =>
                              setEditAccessCode(e.target.value)
                            }
                            placeholder={
                              season.is_private
                                ? "Nech prázdné pro zachování současného kódu"
                                : "Zadej nový přístupový kód"
                            }
                            className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
                          />

                          {season.is_private && (
                            <p className="mt-2 text-xs text-zinc-600">
                              Pokud pole necháš prázdné, současný přístupový
                              kód zůstane zachovaný.
                            </p>
                          )}
                        </label>
                      )}

                      <div className="flex flex-col gap-3 sm:flex-row md:col-span-2">
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex-1 rounded-xl bg-amber-400 px-6 py-4 font-black text-black transition hover:bg-amber-300 disabled:opacity-50"
                        >
                          {saving
                            ? "Ukládám změny…"
                            : "💾 Uložit změny"}
                        </button>

                        <button
                          type="button"
                          onClick={resetEditForm}
                          disabled={saving}
                          className="rounded-xl border border-white/10 bg-white/5 px-6 py-4 font-black text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
                        >
                          Zrušit
                        </button>
                      </div>
                    </div>
                  </form>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}