"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMessage("Nesprávný e-mail nebo heslo.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-[calc(100vh-97px)] items-center justify-center px-5 py-16">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.035] p-7 shadow-2xl sm:p-9">
        <Image
          src="/images/logo-pajova-tip-liga.png"
          alt="Pájova Tip Liga"
          width={150}
          height={150}
          className="mx-auto h-28 w-auto object-contain"
          priority
        />

        <div className="mt-5 text-center">
          <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
            Vítej zpátky
          </p>

          <h1 className="mt-3 text-3xl font-black">Přihlášení</h1>

          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Přihlas se a pokračuj v tipování.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">E-mail</span>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="tvuj@email.cz"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none transition placeholder:text-zinc-600 focus:border-amber-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold">Heslo</span>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              placeholder="Tvoje heslo"
              className="w-full rounded-xl border border-white/10 bg-black px-4 py-3.5 outline-none transition placeholder:text-zinc-600 focus:border-amber-400"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-400 px-5 py-4 font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Přihlašuji…" : "Přihlásit se"}
          </button>
        </form>

        {message && (
          <p className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-sm text-red-300">
            {message}
          </p>
        )}

        <p className="mt-7 text-center text-sm text-zinc-500">
          Ještě nemáš účet?{" "}
          <Link href="/register" className="font-bold text-amber-400">
            Registrovat se
          </Link>
        </p>
      </section>
    </main>
  );
}