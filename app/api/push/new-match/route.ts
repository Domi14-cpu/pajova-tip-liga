import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Chybí serverová proměnná ${name}.`);
  }

  return value;
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const supabaseAnonKey = getRequiredEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = getRequiredEnv(
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY"
    );
    const vapidPrivateKey = getRequiredEnv("VAPID_PRIVATE_KEY");
    const vapidSubject = getRequiredEnv("VAPID_SUBJECT");
    const adminEmail = getRequiredEnv("ADMIN_EMAIL").toLowerCase();

    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return Response.json({ error: "Chybí přihlášení." }, { status: 401 });
    }

    const accessToken = authorization.slice("Bearer ".length);
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } =
      await authClient.auth.getUser(accessToken);

    if (userError || !userData.user) {
      return Response.json(
        { error: "Přihlášení není platné." },
        { status: 401 }
      );
    }

    const isAdmin =
      userData.user.email?.toLowerCase() === adminEmail ||
      userData.user.app_metadata?.role === "admin";

    if (!isAdmin) {
      return Response.json(
        { error: "Tuto akci může provést pouze administrátor." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as { matchId?: unknown };
    const matchId = Number(body.matchId);

    if (!Number.isInteger(matchId) || matchId <= 0) {
      return Response.json(
        { error: "Chybí platné ID zápasu." },
        { status: 400 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: match, error: matchError } = await adminClient
      .from("matches")
      .select("id, home_team, away_team")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return Response.json(
        { error: "Zápas nebyl nalezen." },
        { status: 404 }
      );
    }

    const { data, error: subscriptionsError } = await adminClient
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (subscriptionsError) {
      throw subscriptionsError;
    }

    const subscriptions = (data ?? []) as PushSubscriptionRow[];

    if (subscriptions.length === 0) {
      return Response.json({ sent: 0, removed: 0, failed: 0 });
    }

    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    const payload = JSON.stringify({
      title: "⚽ Nový zápas",
      message: `${match.home_team} – ${match.away_team} byl přidán. Nezapomeň tipovat!`,
      url: `/matches/${match.id}`,
    });

    let sent = 0;
    let failed = 0;
    const staleEndpoints: string[] = [];

    await Promise.all(
      subscriptions.map(async (subscription) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
              },
            },
            payload
          );
          sent += 1;
        } catch (error) {
          const statusCode =
            typeof error === "object" &&
            error !== null &&
            "statusCode" in error
              ? Number(error.statusCode)
              : 0;

          if (statusCode === 404 || statusCode === 410) {
            staleEndpoints.push(subscription.endpoint);
          } else {
            failed += 1;
            console.error("Odeslání Web Push selhalo:", error);
          }
        }
      })
    );

    if (staleEndpoints.length > 0) {
      const { error: deleteError } = await adminClient
        .from("push_subscriptions")
        .delete()
        .in("endpoint", staleEndpoints);

      if (deleteError) {
        console.error("Mazání neplatných odběrů selhalo:", deleteError);
      }
    }

    return Response.json({
      sent,
      removed: staleEndpoints.length,
      failed,
    });
  } catch (error) {
    console.error("Serverové odesílání Web Push selhalo:", error);

    return Response.json(
      { error: "Push upozornění se nepodařilo odeslat." },
      { status: 500 }
    );
  }
}
