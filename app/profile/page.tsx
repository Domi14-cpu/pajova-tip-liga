"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  nickname: string;
  total_points: number;
  exact_predictions: number;
  created_at: string;
  avatar_url: string | null;
  nickname_updated_at: string | null;
};

type Prediction = {
  id: number;
  match_id: number;
  home_score: number;
  away_score: number;
  points: number | null;
  created_at: string;
  updated_at: string;
};

type Match = {
  id: number;
  competition: string;
  home_team: string;
  away_team: string;
  starts_at: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  home_score: number | null;
  away_score: number | null;
};

type PredictionWithMatch = Prediction & {
  match: Match | null;
};

function getResultLabel(points: number | null) {
  if (points === null) {
    return {
      text: "Čeká na vyhodnocení",
      classes:
        "border-white/10 bg-white/[0.04] text-zinc-400",
    };
  }

  if (points === 4) {
    return {
      text: "Přesná remíza",
      classes:
        "border-amber-400/30 bg-amber-400/10 text-amber-300",
    };
  }

  if (points === 3) {
    return {
      text: "Přesný výsledek",
      classes:
        "border-green-500/30 bg-green-500/10 text-green-300",
    };
  }

  if (points === 2) {
    return {
      text: "Správná remíza",
      classes:
        "border-blue-500/30 bg-blue-500/10 text-blue-300",
    };
  }

  if (points === 1) {
    return {
      text: "Správný vítěz",
      classes:
        "border-green-500/20 bg-green-500/10 text-green-300",
    };
  }

  return {
    text: "Tip nevyšel",
    classes:
      "border-red-500/20 bg-red-500/10 text-red-300",
  };
}

function getMatchStatusLabel(status: Match["status"]) {
  if (status === "scheduled") return "Naplánovaný";
  if (status === "live") return "Probíhá";
  if (status === "finished") return "Ukončený";
  return "Zrušený";
}

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState<number | null>(null);
  const [predictions, setPredictions] = useState<
    PredictionWithMatch[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [editingProfile, setEditingProfile] = useState(false);
  const [editNickname, setEditNickname] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? "");

      const [
        profileResult,
        leaderboardResult,
        predictionsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, nickname, total_points, exact_predictions, created_at, avatar_url, nickname_updated_at"
          )
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("profiles")
          .select("id, total_points, exact_predictions")
          .order("total_points", { ascending: false })
          .order("exact_predictions", { ascending: false }),

        supabase
          .from("predictions")
          .select(
            `
              id,
              match_id,
              home_score,
              away_score,
              points,
              created_at,
              updated_at
            `
          )
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false }),
      ]);

      if (profileResult.error || !profileResult.data) {
        setMessage(
          `Profil se nepodařilo načíst: ${
            profileResult.error?.message ??
            "Profil neexistuje."
          }`
        );
        setLoading(false);
        return;
      }

      if (leaderboardResult.error) {
        setMessage(
          `Pořadí se nepodařilo načíst: ${leaderboardResult.error.message}`
        );
        setLoading(false);
        return;
      }

      if (predictionsResult.error) {
        setMessage(
          `Tipy se nepodařilo načíst: ${predictionsResult.error.message}`
        );
        setLoading(false);
        return;
      }

      const loadedProfile = profileResult.data as Profile;
      const loadedPredictions =
        (predictionsResult.data as Prediction[] | null) ?? [];

      setProfile(loadedProfile);
      setEditNickname(loadedProfile.nickname);
      setAvatarPreview(loadedProfile.avatar_url ?? "");

      const leaderboard = leaderboardResult.data ?? [];
      const userPosition =
        leaderboard.findIndex(
          (player) => player.id === user.id
        ) + 1;

      setPosition(userPosition > 0 ? userPosition : null);

      const matchIds = [
        ...new Set(
          loadedPredictions.map(
            (prediction) => prediction.match_id
          )
        ),
      ];

      let loadedMatches: Match[] = [];

      if (matchIds.length > 0) {
        const { data: matchesData, error: matchesError } =
          await supabase
            .from("matches")
            .select(
              `
                id,
                competition,
                home_team,
                away_team,
                starts_at,
                status,
                home_score,
                away_score
              `
            )
            .in("id", matchIds);

        if (matchesError) {
          setMessage(
            `Zápasy se nepodařilo načíst: ${matchesError.message}`
          );
          setLoading(false);
          return;
        }

        loadedMatches =
          (matchesData as Match[] | null) ?? [];
      }

      const predictionsWithMatches =
        loadedPredictions.map((prediction) => ({
          ...prediction,
          match:
            loadedMatches.find(
              (match) => match.id === prediction.match_id
            ) ?? null,
        }));

      setPredictions(predictionsWithMatches);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setMessage("");

    if (!file) {
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Avatar musí být obrázek JPG, PNG nebo WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("Avatar může mít maximálně 2 MB.");
      event.target.value = "";
      return;
    }

    setAvatarFile(file);

    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    const nickname = editNickname.trim();

    if (nickname.length < 3 || nickname.length > 24) {
      setMessage("Přezdívka musí mít 3 až 24 znaků.");
      return;
    }

    setSavingProfile(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Přihlášení už vypršelo.");
      }

      let avatarUrl = profile.avatar_url ?? "";

      if (avatarFile) {
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(`${user.id}/avatar`, avatarFile, {
            upsert: true,
            contentType: avatarFile.type,
            cacheControl: "3600",
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(`${user.id}/avatar`);

        avatarUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;
      }

      const { error: updateError } = await supabase.rpc(
        "update_own_profile",
        {
          p_nickname: nickname,
          p_avatar_url: avatarUrl,
        }
      );

      if (updateError) {
        throw updateError;
      }

      setProfile((current) =>
        current
          ? {
              ...current,
              nickname,
              avatar_url: avatarUrl || null,
              nickname_updated_at:
                nickname !== current.nickname
                  ? new Date().toISOString()
                  : current.nickname_updated_at,
            }
          : current
      );
      setAvatarFile(null);
      setAvatarPreview(avatarUrl);
      setEditingProfile(false);
      setMessage("Profil byl úspěšně upraven.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Profil se nepodařilo upravit."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!profile) {
      return;
    }

    setSavingProfile(true);
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("Přihlášení už vypršelo.");
      }

      const { error: deleteError } = await supabase.storage
        .from("avatars")
        .remove([`${user.id}/avatar`]);

      if (deleteError) {
        throw deleteError;
      }

      const { error: updateError } = await supabase.rpc(
        "update_own_profile",
        {
          p_nickname: profile.nickname,
          p_avatar_url: "",
        }
      );

      if (updateError) {
        throw updateError;
      }

      setProfile((current) =>
        current ? { ...current, avatar_url: null } : current
      );
      setAvatarFile(null);
      setAvatarPreview("");
      setMessage("Profilový obrázek byl odstraněn.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Profilový obrázek se nepodařilo odstranit."
      );
    } finally {
      setSavingProfile(false);
    }
  }
  if (loading) {
    return (
      <main className="flex min-h-[calc(100vh-84px)] items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-amber-400" />

          <p className="mt-5 font-bold text-zinc-400">
            Načítám tvůj profil…
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-16">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-red-300">
          {message || "Profil se nepodařilo načíst."}
        </div>
      </main>
    );
  }

  const evaluatedPredictions = predictions.filter(
    (prediction) => prediction.points !== null
  );

  const successfulPredictions = evaluatedPredictions.filter(
    (prediction) =>
      prediction.points !== null &&
      prediction.points > 0
  );

  const successRate =
    evaluatedPredictions.length > 0
      ? Math.round(
          (successfulPredictions.length /
            evaluatedPredictions.length) *
            100
        )
      : 0;

  const pendingPredictions = predictions.filter(
    (prediction) => prediction.points === null
  ).length;

  const memberSince = new Date(
    profile.created_at
  ).toLocaleDateString("cs-CZ", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(251,191,36,0.16),transparent_38%)]" />

        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:py-20">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[1.5rem] bg-amber-400 text-3xl font-black text-black shadow-xl shadow-amber-400/10 sm:h-24 sm:w-24 sm:text-4xl">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.nickname}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  profile.nickname.charAt(0).toUpperCase()
                )}
              </div>

              <div className="min-w-0">
                <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
                  Profil tipéra
                </p>

                <h1 className="mt-2 truncate text-4xl font-black sm:text-5xl">
                  {profile.nickname}
                </h1>

                <p className="mt-3 truncate text-zinc-400">
                  {email}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setEditNickname(profile.nickname);
                  setAvatarPreview(profile.avatar_url ?? "");
                  setAvatarFile(null);
                  setEditingProfile((current) => !current);
                }}
                className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-6 py-3.5 font-black text-amber-300 transition hover:bg-amber-400 hover:text-black"
              >
                ✏️ Upravit profil
              </button>

              <Link
                href="/matches"
                className="rounded-xl bg-amber-400 px-6 py-3.5 font-black text-black transition hover:-translate-y-0.5 hover:bg-amber-300"
              >
                Tipovat zápasy
              </Link>

              <Link
                href="/leaderboard"
                className="rounded-xl border border-white/10 bg-white/[0.035] px-6 py-3.5 font-black text-zinc-300 transition hover:border-amber-400/40 hover:text-white"
              >
                Celý žebříček
              </Link>
            </div>
          </div>

          <p className="mt-8 text-sm font-bold text-zinc-500">
            Členem od {memberSince}
          </p>
        </div>
      </section>

      {message && (
        <section className="mx-auto max-w-7xl px-5 pt-8">
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
            {message}
          </p>
        </section>
      )}

      {editingProfile && (
        <section className="mx-auto max-w-7xl px-5 pt-8">
          <form
            onSubmit={handleSaveProfile}
            className="rounded-[2rem] border border-amber-400/20 bg-white/[0.035] p-6 sm:p-8"
          >
            <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
              Nastavení profilu
            </p>
            <h2 className="mt-2 text-2xl font-black">Upravit profil</h2>

            <div className="mt-7 grid gap-6 md:grid-cols-[180px_1fr] md:items-start">
              <div>
                <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[1.5rem] bg-amber-400 text-4xl font-black text-black">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Náhled avataru"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    editNickname.charAt(0).toUpperCase() || "?"
                  )}
                </div>

                {profile.avatar_url && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    disabled={savingProfile}
                    className="mt-3 text-sm font-bold text-red-300 transition hover:text-red-200 disabled:opacity-50"
                  >
                    Odstranit obrázek
                  </button>
                )}
              </div>

              <div className="grid gap-5">
                <label>
                  <span className="mb-2 block text-sm font-bold">
                    Přezdívka
                  </span>
                  <input
                    value={editNickname}
                    onChange={(event) => setEditNickname(event.target.value)}
                    minLength={3}
                    maxLength={24}
                    required
                    className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400"
                  />
                  <span className="mt-2 block text-xs text-zinc-500">
                    Přezdívku lze změnit jednou za 7 dní.
                  </span>
                </label>

                <label>
                  <span className="mb-2 block text-sm font-bold">
                    Profilový obrázek
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarChange}
                    className="block w-full rounded-xl border border-white/10 bg-black p-3 text-sm text-zinc-400 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-400 file:px-4 file:py-2 file:font-black file:text-black"
                  />
                  <span className="mt-2 block text-xs text-zinc-500">
                    JPG, PNG nebo WebP, maximálně 2 MB.
                  </span>
                </label>

                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    disabled={savingProfile}
                    className="rounded-xl border border-white/10 px-5 py-3 font-black text-zinc-300 disabled:opacity-50"
                  >
                    Zrušit
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-xl bg-amber-400 px-6 py-3 font-black text-black transition hover:bg-amber-300 disabled:opacity-50"
                  >
                    {savingProfile ? "Ukládám…" : "Uložit profil"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </section>
      )}
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              Body
            </p>

            <p className="mt-3 text-4xl font-black text-amber-400">
              {profile.total_points}
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              Pořadí
            </p>

            <p className="mt-3 text-4xl font-black">
              {position ? `${position}.` : "–"}
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              Přesné tipy
            </p>

            <p className="mt-3 text-4xl font-black">
              {profile.exact_predictions}
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              Úspěšnost
            </p>

            <p className="mt-3 text-4xl font-black">
              {successRate} %
            </p>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">
              Čeká na výsledek
            </p>

            <p className="mt-3 text-4xl font-black">
              {pendingPredictions}
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-24">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
              Historie
            </p>

            <h2 className="mt-2 text-3xl font-black sm:text-4xl">
              Tvoje tipy
            </h2>

            <p className="mt-3 text-zinc-400">
              Celkem odevzdaných tipů: {predictions.length}
            </p>
          </div>
        </div>

        {predictions.length === 0 ? (
          <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-10 text-center">
            <span className="text-6xl">🎯</span>

            <h3 className="mt-6 text-2xl font-black">
              Zatím nemáš žádný tip
            </h3>

            <p className="mx-auto mt-3 max-w-md text-zinc-400">
              Vyber si první zápas a zkus odhadnout jeho
              přesný výsledek.
            </p>

            <Link
              href="/matches"
              className="mt-7 inline-block rounded-xl bg-amber-400 px-6 py-3.5 font-black text-black"
            >
              Přejít na zápasy
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {predictions.map((prediction) => {
              const match = prediction.match;
              const resultLabel = getResultLabel(
                prediction.points
              );

              const kickoff = match
                ? new Date(match.starts_at)
                : null;

              return (
                <article
                  key={prediction.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-amber-400/30 sm:p-6"
                >
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
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

                    <div className="flex flex-wrap items-center gap-2">
                      {match && (
                        <span className="rounded-full border border-white/10 bg-black px-3 py-1 text-xs font-bold text-zinc-400">
                          {getMatchStatusLabel(
                            match.status
                          )}
                        </span>
                      )}

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-black ${resultLabel.classes}`}
                      >
                        {resultLabel.text}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 grid items-center gap-5 md:grid-cols-[1fr_auto_1fr_auto]">
                    <p className="text-center font-black md:text-right">
                      {match?.home_team ?? "Domácí"}
                    </p>

                    <div className="text-center">
                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                        Tvůj tip
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
      {match.home_score} : {match.away_score}
    </p>
  </>
) : (
  <p className="text-sm font-bold text-zinc-500">
    Výsledek čeká
  </p>
)}
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-5">
                    <p className="text-sm font-bold text-zinc-500">
                      Získané body
                    </p>

                    <p
                      className={`text-xl font-black ${
                        prediction.points === null
                          ? "text-zinc-500"
                          : prediction.points > 0
                            ? "text-green-300"
                            : "text-red-300"
                      }`}
                    >
                      {prediction.points === null
                        ? "–"
                        : prediction.points > 0
                          ? `+${prediction.points}`
                          : prediction.points}
                    </p>
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