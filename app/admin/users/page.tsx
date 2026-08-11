"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type UserProfile = {
  id: string;
  nickname: string;
  total_points: number;
  exact_predictions: number;
  created_at: string;
};

type AdminRow = {
  user_id: string;
};

type PredictionRow = {
  user_id: string;
};

type UserWithStats = UserProfile & {
  is_admin: boolean;
  predictions_count: number;
};

type EditUserModalProps = {
  user: UserWithStats | null;
  saving: boolean;
  onClose: () => void;
  onSave: (values: {
    nickname: string;
    totalPoints: number;
    exactPredictions: number;
  }) => Promise<void>;
};

function EditUserModal({
  user,
  saving,
  onClose,
  onSave,
}: EditUserModalProps) {
  const [nickname, setNickname] = useState("");
  const [totalPoints, setTotalPoints] = useState("");
  const [exactPredictions, setExactPredictions] =
    useState("");
  const [localMessage, setLocalMessage] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }

    setNickname(user.nickname);
    setTotalPoints(String(user.total_points));
    setExactPredictions(String(user.exact_predictions));
    setLocalMessage("");
  }, [user]);

  if (!user) {
    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setLocalMessage("");

    const parsedPoints = Number(totalPoints);
    const parsedExactPredictions = Number(exactPredictions);
    const trimmedNickname = nickname.trim();

    if (trimmedNickname.length < 3) {
      setLocalMessage(
        "Přezdívka musí mít alespoň 3 znaky."
      );
      return;
    }

    if (
      !Number.isInteger(parsedPoints)
    ) {
      setLocalMessage(
        "Body musí být celé číslo."
      );
      return;
    }

    if (
      !Number.isInteger(parsedExactPredictions) ||
      parsedExactPredictions < 0
    ) {
      setLocalMessage(
        "Počet přesných tipů musí být nezáporné celé číslo."
      );
      return;
    }

    await onSave({
      nickname: trimmedNickname,
      totalPoints: parsedPoints,
      exactPredictions: parsedExactPredictions,
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
              Upravit uživatele
            </h2>

            <p className="mt-3 text-sm text-zinc-400">
              Změň přezdívku nebo statistiky uživatele.
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

        <div className="mt-7 flex items-center gap-4 rounded-2xl border border-white/10 bg-black p-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-xl font-black text-black">
            {user.nickname.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="truncate font-black">
              {user.nickname}
            </p>

            <p className="mt-1 truncate text-xs text-zinc-500">
              ID: {user.id}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-7 grid gap-5 sm:grid-cols-2"
        >
          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold">
              Přezdívka
            </span>

            <input
              value={nickname}
              onChange={(event) =>
                setNickname(event.target.value)
              }
              minLength={3}
              maxLength={24}
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Celkem bodů
            </span>

            <input
              type="number"
              step="1"
              value={totalPoints}
              onChange={(event) =>
                setTotalPoints(event.target.value)
              }
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
            />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold">
              Přesné tipy
            </span>

            <input
              type="number"
              min="0"
              step="1"
              value={exactPredictions}
              onChange={(event) =>
                setExactPredictions(event.target.value)
              }
              required
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [currentUserId, setCurrentUserId] = useState<
    string | null
  >(null);

  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] =
    useState<UserWithStats | null>(null);

  const [loadingData, setLoadingData] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [workingUserId, setWorkingUserId] = useState<
    string | null
  >(null);
  const [message, setMessage] = useState("");

  async function loadUsers() {
    setLoadingData(true);
    setMessage("");

    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      setMessage(
        "Nepodařilo se ověřit přihlášeného administrátora."
      );
      setLoadingData(false);
      return;
    }

    setCurrentUserId(currentUser.id);

    const [profilesResult, adminsResult, predictionsResult] =
      await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, nickname, total_points, exact_predictions, created_at"
          )
          .order("total_points", { ascending: false })
          .order("exact_predictions", {
            ascending: false,
          }),

        supabase.from("admins").select("user_id"),

        supabase.from("predictions").select("user_id"),
      ]);

    if (profilesResult.error) {
      setMessage(
        `Uživatelé se nepodařili načíst: ${profilesResult.error.message}`
      );
      setLoadingData(false);
      return;
    }

    if (adminsResult.error) {
      setMessage(
        `Role administrátorů se nepodařily načíst: ${adminsResult.error.message}`
      );
      setLoadingData(false);
      return;
    }

    if (predictionsResult.error) {
      setMessage(
        `Počty tipů se nepodařily načíst: ${predictionsResult.error.message}`
      );
      setLoadingData(false);
      return;
    }

    const loadedProfiles =
      (profilesResult.data as UserProfile[] | null) ?? [];

    const loadedAdmins =
      (adminsResult.data as AdminRow[] | null) ?? [];

    const loadedPredictions =
      (predictionsResult.data as PredictionRow[] | null) ??
      [];

    const adminIds = new Set(
      loadedAdmins.map((admin) => admin.user_id)
    );

    const predictionsCount = new Map<string, number>();

    loadedPredictions.forEach((prediction) => {
      predictionsCount.set(
        prediction.user_id,
        (predictionsCount.get(prediction.user_id) ?? 0) +
          1
      );
    });

    const usersWithStats = loadedProfiles.map((profile) => ({
      ...profile,
      is_admin: adminIds.has(profile.id),
      predictions_count:
        predictionsCount.get(profile.id) ?? 0,
    }));

    setUsers(usersWithStats);
    setLoadingData(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return users;
    }

    return users.filter(
      (user) =>
        user.nickname.toLowerCase().includes(query) ||
        user.id.toLowerCase().includes(query)
    );
  }, [search, users]);

  const totalPoints = users.reduce(
    (sum, user) => sum + user.total_points,
    0
  );

  const totalPredictions = users.reduce(
    (sum, user) => sum + user.predictions_count,
    0
  );

  const adminsCount = users.filter(
    (user) => user.is_admin
  ).length;

  async function handleSaveEdit(values: {
    nickname: string;
    totalPoints: number;
    exactPredictions: number;
  }) {
    if (!editingUser) {
      return;
    }

    setSavingEdit(true);
    setMessage("");

    try {
      const { error } = await supabase.rpc(
        "admin_update_user_profile",
        {
          p_user_id: editingUser.id,
          p_nickname: values.nickname,
          p_total_points: values.totalPoints,
          p_exact_predictions: values.exactPredictions,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      setEditingUser(null);
      setMessage(
        `Uživatel ${values.nickname} byl úspěšně upraven.`
      );

      await loadUsers();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nastala neznámá chyba.";

      setMessage(
        `Uživatele se nepodařilo upravit: ${errorMessage}`
      );
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleAdmin(user: UserWithStats) {
    if (
      user.id === currentUserId &&
      user.is_admin
    ) {
      setMessage(
        "Nemůžeš odebrat administrátorskou roli sám sobě."
      );
      return;
    }

    const confirmed = window.confirm(
      user.is_admin
        ? `Opravdu chceš odebrat administrátorskou roli uživateli ${user.nickname}?`
        : `Opravdu chceš udělit administrátorskou roli uživateli ${user.nickname}?`
    );

    if (!confirmed) {
      return;
    }

    setWorkingUserId(user.id);
    setMessage("");

    try {
      const { error } = await supabase.rpc(
        "admin_set_user_role",
        {
          p_user_id: user.id,
          p_is_admin: !user.is_admin,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      setMessage(
        user.is_admin
          ? `Uživateli ${user.nickname} byla odebrána role administrátora.`
          : `Uživatel ${user.nickname} je nyní administrátor.`
      );

      await loadUsers();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nastala neznámá chyba.";

      setMessage(
        `Změna role se nepodařila: ${errorMessage}`
      );
    } finally {
      setWorkingUserId(null);
    }
  }

  async function handleResetStatistics(
    user: UserWithStats
  ) {
    const confirmed = window.confirm(
      `Opravdu chceš resetovat body a přesné tipy uživatele ${user.nickname}? Jeho uložené tipy se nesmažou.`
    );

    if (!confirmed) {
      return;
    }

    setWorkingUserId(user.id);
    setMessage("");

    try {
      const { error } = await supabase.rpc(
        "admin_reset_user_statistics",
        {
          p_user_id: user.id,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      setMessage(
        `Statistiky uživatele ${user.nickname} byly resetovány.`
      );

      await loadUsers();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Nastala neznámá chyba.";

      setMessage(
        `Reset statistik se nepodařil: ${errorMessage}`
      );
    } finally {
      setWorkingUserId(null);
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
            Uživatelé
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-zinc-400">
            Spravuj přezdívky, body, statistiky a
            administrátorské role.
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
            Uživatelé
          </p>

          <p className="mt-3 text-4xl font-black text-amber-400">
            {users.length}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
            Administrátoři
          </p>

          <p className="mt-3 text-4xl font-black">
            {adminsCount}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
            Celkem tipů
          </p>

          <p className="mt-3 text-4xl font-black">
            {totalPredictions}
          </p>
        </article>

        <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
          <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
            Rozdané body
          </p>

          <p className="mt-3 text-4xl font-black">
            {totalPoints}
          </p>
        </article>
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
              Databáze
            </p>

            <h2 className="mt-2 text-3xl font-black">
              Přehled účtů
            </h2>
          </div>

          <label className="w-full md:max-w-sm">
            <span className="sr-only">
              Hledat uživatele
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Hledat podle přezdívky…"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none placeholder:text-zinc-600 focus:border-amber-400"
            />
          </label>
        </div>

        {loadingData ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" />

              <p className="mt-4 font-bold text-zinc-400">
                Načítám uživatele…
              </p>
            </div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-white/10 bg-black p-8 text-center text-zinc-400">
            Nebyl nalezen žádný uživatel.
          </p>
        ) : (
          <div className="mt-7 grid gap-4">
            {filteredUsers.map((user, index) => {
              const registeredAt = new Date(
                user.created_at
              ).toLocaleDateString("cs-CZ");

              const working =
                workingUserId === user.id;

              return (
                <article
                  key={user.id}
                  className="rounded-2xl border border-white/10 bg-black p-5 transition hover:border-amber-400/25 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-xl font-black text-black">
                        {user.nickname
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-lg font-black">
                            {user.nickname}
                          </h3>

                          {user.is_admin && (
                            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-black text-amber-300">
                              ADMIN
                            </span>
                          )}

                          {user.id === currentUserId && (
                            <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-black text-blue-300">
                              TY
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-zinc-500">
                          #{index + 1} · Registrace{" "}
                          {registeredAt}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:min-w-[440px]">
                      <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-center">
                        <p className="text-xs font-bold uppercase text-zinc-500">
                          Body
                        </p>

                        <p className="mt-1 font-black text-amber-400">
                          {user.total_points}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-center">
                        <p className="text-xs font-bold uppercase text-zinc-500">
                          Přesné
                        </p>

                        <p className="mt-1 font-black">
                          {user.exact_predictions}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-center">
                        <p className="text-xs font-bold uppercase text-zinc-500">
                          Tipy
                        </p>

                        <p className="mt-1 font-black">
                          {user.predictions_count}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3 text-center">
                        <p className="text-xs font-bold uppercase text-zinc-500">
                          Role
                        </p>

                        <p className="mt-1 font-black">
                          {user.is_admin
                            ? "Admin"
                            : "Tipér"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setEditingUser(user)}
                      disabled={working}
                      className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm font-black text-amber-300 transition hover:bg-amber-400 hover:text-black disabled:opacity-50"
                    >
                      ✏️ Upravit
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleToggleAdmin(user)
                      }
                      disabled={
                        working ||
                        (user.id === currentUserId &&
                          user.is_admin)
                      }
                      className={`rounded-xl border px-4 py-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        user.is_admin
                          ? "border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500 hover:text-white"
                          : "border-blue-400/30 bg-blue-400/10 text-blue-300 hover:bg-blue-400 hover:text-black"
                      }`}
                    >
                      {working
                        ? "Pracuji…"
                        : user.is_admin
                          ? "Odebrat admina"
                          : "Udělat adminem"}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleResetStatistics(user)
                      }
                      disabled={working}
                      className="rounded-xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm font-black text-zinc-300 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                    >
                      🔄 Reset statistik
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <EditUserModal
        user={editingUser}
        saving={savingEdit}
        onClose={() => {
          if (!savingEdit) {
            setEditingUser(null);
          }
        }}
        onSave={handleSaveEdit}
      />
    </main>
  );
}
