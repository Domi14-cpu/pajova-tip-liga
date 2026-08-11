"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export default function PushNotifications() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkPushStatus() {
      const pushSupported =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      setSupported(pushSupported);

      if (!pushSupported) {
        setLoading(false);
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setEnabled(Boolean(subscription));
      } catch (error) {
        console.error("Kontrola push notifikací selhala:", error);
      } finally {
        setLoading(false);
      }
    }

    checkPushStatus();
  }, []);

  async function enablePushNotifications() {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Pro zapnutí upozornění se musíš přihlásit.");
        return;
      }

      const permission = await Notification.requestPermission();

      if (permission !== "granted") {
        setMessage("Upozornění nebyla povolena.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

        if (!publicKey) {
          throw new Error("Chybí NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
        }

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      const json = subscription.toJSON();
      const endpoint = subscription.endpoint;
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;

      if (!p256dh || !auth) {
        throw new Error("Push subscription neobsahuje potřebné klíče.");
      }

      const { data: existingSubscription, error: existingError } =
        await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .eq("endpoint", endpoint)
          .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (!existingSubscription) {
        const { error: insertError } = await supabase
          .from("push_subscriptions")
          .insert({ user_id: user.id, endpoint, p256dh, auth });

        if (insertError) {
          throw insertError;
        }
      }

      setEnabled(true);
      setMessage("Push upozornění jsou zapnutá.");
    } catch (error) {
      console.error("Zapnutí push notifikací selhalo:", error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Push upozornění se nepodařilo zapnout."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!supported && !loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <div className="flex items-center gap-3">
          <BellOff className="text-zinc-500" />
          <div>
            <p className="font-black">Push upozornění nejsou podporována</p>
            <p className="mt-1 text-sm text-zinc-500">
              Toto zařízení nebo prohlížeč je momentálně nepodporuje.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
            <Bell size={21} />
          </div>
          <div>
            <p className="font-black">Push upozornění</p>
            <p className="mt-1 text-sm leading-6 text-zinc-500">
              Dostávej upozornění na nové zápasy a připomínky přímo do zařízení.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={enablePushNotifications}
          disabled={loading || enabled}
          className="rounded-xl bg-amber-400 px-5 py-3 font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Kontroluji…"
            : enabled
              ? "✓ Upozornění zapnuta"
              : "Povolit upozornění"}
        </button>
      </div>

      {message && (
        <p className="mt-4 rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-zinc-300">
          {message}
        </p>
      )}
    </div>
  );
}
