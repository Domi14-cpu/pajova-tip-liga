const upcomingMatches = [
  {
    id: 1,
    league: "Chance Liga",
    home: "Slavia Praha",
    away: "Sparta Praha",
    date: "Neděle",
    time: "18:00",
  },
  {
    id: 2,
    league: "Premier League",
    home: "Manchester City",
    away: "Liverpool",
    date: "Pondělí",
    time: "20:00",
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#080808] text-white">
      <div className="mx-auto max-w-7xl px-5 py-10">
        <section className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-7 sm:p-10">
          <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
            Pájova Tip Liga
          </p>

          <h1 className="mt-3 text-4xl font-black sm:text-5xl">
            Ahoj, Dominiku 👋
          </h1>

          <p className="mt-4 max-w-2xl text-zinc-400">
            Tady uvidíš svoje body, pořadí, nadcházející zápasy a poslední
            výsledky.
          </p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["184", "Celkem bodů"],
            ["7.", "Aktuální pořadí"],
            ["12", "Přesných tipů"],
            ["68 %", "Úspěšnost"],
          ].map(([value, label]) => (
            <article
              key={label}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-6"
            >
              <p className="text-3xl font-black text-amber-400">{value}</p>
              <p className="mt-2 text-sm font-semibold text-zinc-500">
                {label}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="font-bold uppercase tracking-[0.22em] text-amber-400">
                Další tipy
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Nadcházející zápasy
              </h2>
            </div>

            <a
              href="/matches"
              className="text-sm font-bold text-zinc-400 transition hover:text-white"
            >
              Zobrazit všechny →
            </a>
          </div>

          <div className="grid gap-4">
            {upcomingMatches.map((match) => (
              <article
                key={match.id}
                className="grid items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5 md:grid-cols-[150px_1fr_auto]"
              >
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    {match.league}
                  </p>
                  <p className="mt-1 font-black text-amber-400">
                    {match.date} · {match.time}
                  </p>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <p className="text-right font-bold">{match.home}</p>
                  <span className="text-sm font-black text-zinc-600">VS</span>
                  <p className="font-bold">{match.away}</p>
                </div>

                <button className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-black transition hover:bg-amber-300">
                  Tipovat
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <h2 className="text-xl font-black">Poslední výsledek</h2>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black p-5">
              <p className="text-sm text-zinc-500">
                Barcelona 1 : 1 Real Madrid
              </p>

              <p className="mt-4 text-sm text-zinc-400">Tvůj tip: 2 : 2</p>

              <p className="mt-3 text-xl font-black text-amber-400">
                Nepřesná remíza · +2 body
              </p>
            </div>
          </article>

          <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
            <h2 className="text-xl font-black">Bodovací pravidla</h2>

            <div className="mt-5 space-y-3 text-sm">
              {[
                ["Přesná remíza", "+4"],
                ["Přesný výsledek", "+3"],
                ["Nepřesná remíza", "+2"],
                ["Správný vítěz", "+1"],
                ["Netrefeno", "−1"],
                ["Bez tipu", "−2"],
              ].map(([label, points]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-white/10 pb-3"
                >
                  <span className="text-zinc-400">{label}</span>
                  <span className="font-black">{points}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}