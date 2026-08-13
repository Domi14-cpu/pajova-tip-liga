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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadSeasons() {
    setLoading(true);
    const { data, error } = await supabase
      .from("seasons")
      .select("id, name, description, starts_at, ends_at, is_private, is_active")
      .order("starts_at", { ascending: false });

    if (error) setMessage(`Sezóny se nepodařilo načíst: ${error.message}`);
    else setSeasons((data as Season[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => { loadSeasons(); }, []);

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
      setMessage(`Sezónu se nepodařilo vytvořit: ${error?.message ?? "Neznámá chyba."}`);
      setSaving(false);
      return;
    }

    const { error: activateError } = await supabase
      .from("seasons")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", seasonId);

    if (activateError) {
      setMessage(`Sezóna vznikla, ale nepodařilo se ji aktivovat: ${activateError.message}`);
    } else {
      setName(""); setDescription(""); setStartsAt(""); setEndsAt(""); setIsPrivate(false); setAccessCode("");
      setMessage("Sezóna byla vytvořena a je aktivní.");
      await loadSeasons();
    }
    setSaving(false);
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-14 pb-28 lg:pb-14">
      <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-7 sm:p-10">
        <p className="font-bold uppercase tracking-[0.22em] text-amber-400">Administrace</p>
        <h1 className="mt-3 text-4xl font-black sm:text-5xl">Sezóny</h1>
        <p className="mt-4 max-w-2xl leading-7 text-zinc-400">Vytvářej veřejné sezóny pro všechny tipéry nebo zamknuté sezóny s vlastním kódem.</p>
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
        <h2 className="text-2xl font-black">Vytvořit sezónu</h2>
        <form onSubmit={handleSubmit} className="mt-7 grid gap-5 md:grid-cols-2">
          <label className="md:col-span-2"><span className="mb-2 block text-sm font-bold">Název sezóny</span><input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Např. Parta z Ústí 2026" className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400" /></label>
          <label className="md:col-span-2"><span className="mb-2 block text-sm font-bold">Popis (volitelné)</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400" /></label>
          <label><span className="mb-2 block text-sm font-bold">Začátek</span><input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400" /></label>
          <label><span className="mb-2 block text-sm font-bold">Konec</span><input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400" /></label>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/40 p-4 md:col-span-2"><span><span className="block font-black">🔒 Zamknutá sezóna</span><span className="mt-1 block text-sm text-zinc-500">Připojení bude možné jen po zadání kódu.</span></span><input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} className="h-5 w-5 accent-amber-400" /></label>
          {isPrivate && <label className="md:col-span-2"><span className="mb-2 block text-sm font-bold">Přístupový kód</span><input type="password" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} required className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none focus:border-amber-400" /></label>}
          <button type="submit" disabled={saving} className="rounded-xl bg-amber-400 px-6 py-4 font-black text-black transition hover:bg-amber-300 disabled:opacity-50 md:col-span-2">{saving ? "Vytvářím sezónu…" : "Vytvořit sezónu"}</button>
        </form>
        {message && <p className="mt-5 rounded-xl border border-white/10 bg-black p-4 text-sm text-zinc-300">{message}</p>}
      </section>

      <section className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 sm:p-8">
        <h2 className="text-2xl font-black">Existující sezóny</h2>
        {loading ? <p className="mt-6 text-zinc-400">Načítám sezóny…</p> : <div className="mt-6 grid gap-4">{seasons.map((season) => <article key={season.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-white/10 bg-black/30 p-5 sm:flex-row sm:items-center"><div><p className="font-black">{season.is_private ? "🔒 " : "🌍 "}{season.name}</p><p className="mt-1 text-sm text-zinc-500">{season.description || "Bez popisu"}</p></div><span className={`w-fit rounded-full px-3 py-1.5 text-xs font-black ${season.is_active ? "bg-green-500/10 text-green-300" : "bg-zinc-800 text-zinc-400"}`}>{season.is_active ? "Aktivní" : "Neaktivní"}</span></article>)}</div>}
      </section>
    </main>
  );
}
