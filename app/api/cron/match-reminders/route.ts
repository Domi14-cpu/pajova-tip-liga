import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

export const runtime = "nodejs";

type Match = {
  id: number;
  home_team: string;
  away_team: string;
  starts_at: string;
};

type Subscription = {
  user_id: string;
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

export async function GET(request: Request) {
  try {
    const cronSecret = getRequiredEnv("CRON_SECRET");

    if (
      request.headers.get("authorization") !==
      `Bearer ${cronSecret}`
    ) {
      return Response.json({ error: "Nepovolený přístup." }, { status: 401 });
    }

    const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = getRequiredEnv(
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY"
    );
    const vapidPrivateKey = getRequiredEnv("VAPID_PRIVATE_KEY");
    const vapidSubject = getRequiredEnv("VAPID_SUBJECT");

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    );

    const now = Date.now();
    const windowStart = new Date(now + 55 * 60 * 1000).toISOString();
    const windowEnd = new Date(now + 65 * 60 * 1000).toISOString();

    const { data: matchData, error: matchesError } = await supabase
      .from("matches")
      .select("id, home_team, away_team, starts_at")
      .eq("status", "scheduled")
      .gte("starts_at", windowStart)
      .lt("starts_at", windowEnd);

    if (matchesError) {
      throw matchesError;
    }

    const matches = (matchData ?? []) as Match[];
    let sent = 0;
    let failed = 0;
    let remindersCreated = 0;
    const staleEndpoints = new Set<string>();

    for (const match of matches) {
      const [profilesResult, predictionsResult, remindersResult] =
        await Promise.all([
          supabase.from("profiles").select("id"),
          supabase
            .from("predictions")
            .select("user_id")
            .eq("match_id", match.id),
          supabase
            .from("notifications")
            .select("user_id")
            .eq("match_id", match.id)
            .eq("type", "match_reminder"),
        ]);

      if (profilesResult.error) {
        throw profilesResult.error;
      }

      if (predictionsResult.error) {
        throw predictionsResult.error;
      }

      if (remindersResult.error) {
        throw remindersResult.error;
      }

      const usersWithPrediction = new Set(
        (predictionsResult.data ?? []).map((item) => item.user_id)
      );
      const usersAlreadyReminded = new Set(
        (remindersResult.data ?? []).map((item) => item.user_id)
      );
      const eligibleUserIds = (profilesResult.data ?? [])
        .map((profile) => profile.id)
        .filter(
          (userId) =>
            !usersWithPrediction.has(userId) &&
            !usersAlreadyReminded.has(userId)
        );

      if (eligibleUserIds.length === 0) {
        continue;
      }

      const { data: subscriptionData, error: subscriptionsError } =
        await supabase
          .from("push_subscriptions")
          .select("user_id, endpoint, p256dh, auth")
          .in("user_id", eligibleUserIds);

      if (subscriptionsError) {
        throw subscriptionsError;
      }

      const subscriptions = (subscriptionData ?? []) as Subscription[];
      const payload = JSON.stringify({
        title: "⏰ Nezapomeň tipovat",
        message: `${match.home_team} – ${match.away_team} začíná přibližně za hodinu.`,
        url: `/matches/${match.id}`,
      });

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
              staleEndpoints.add(subscription.endpoint);
            } else {
              failed += 1;
              console.error("Odeslání připomínky selhalo:", error);
            }
          }
        })
      );

      const reminderRows = eligibleUserIds.map((userId) => ({
        user_id: userId,
        title: "⏰ Nezapomeň tipovat",
        message: `${match.home_team} – ${match.away_team} začíná přibližně za hodinu.`,
        type: "match_reminder",
        match_id: match.id,
        read: false,
      }));

      const { error: reminderError } = await supabase
        .from("notifications")
        .insert(reminderRows);

      if (reminderError) {
        if (reminderError.code !== "23505") {
          throw reminderError;
        }
      } else {
        remindersCreated += reminderRows.length;
      }
    }

    if (staleEndpoints.size > 0) {
      const { error: deleteError } = await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", [...staleEndpoints]);

      if (deleteError) {
        console.error("Mazání neplatných odběrů selhalo:", deleteError);
      }
    }

    return Response.json({
      checkedMatches: matches.length,
      remindersCreated,
      sent,
      failed,
      removed: staleEndpoints.size,
    });
  } catch (error) {
    console.error("Automatické připomínky selhaly:", error);

    return Response.json(
      { error: "Automatické připomínky se nepodařilo zpracovat." },
      { status: 500 }
    );
  }
}
