"use client";

type DeleteDialogProps = {
  open: boolean;
  title: string;
  description: string;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

export default function DeleteDialog({
  open,
  title,
  description,
  deleting = false,
  onCancel,
  onConfirm,
}: DeleteDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Zavřít potvrzení"
        onClick={onCancel}
        className="absolute inset-0 cursor-default"
      />

      <section className="relative z-10 w-full max-w-md rounded-[2rem] border border-white/10 bg-[#101010] p-7 shadow-2xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl">
          🗑️
        </div>

        <h2 className="mt-6 text-2xl font-black">{title}</h2>

        <p className="mt-3 leading-7 text-zinc-400">{description}</p>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-white/10 px-5 py-3 font-black text-zinc-300 transition hover:border-white/30 disabled:opacity-50"
          >
            Zrušit
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-xl bg-red-500 px-5 py-3 font-black text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? "Mažu tým…" : "Ano, smazat"}
          </button>
        </div>
      </section>
    </div>
  );
}