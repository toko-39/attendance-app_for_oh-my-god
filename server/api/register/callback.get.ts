import { getAuth } from "firebase-admin/auth";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const query = getQuery(event);
  const code = query.code as string | undefined;
  const state = query.state as string | undefined;
  const storedState = getCookie(event, "line_login_state");

  if (!code || !state || state !== storedState) {
    return sendRedirect(event, "/register?error=invalid_state");
  }
  deleteCookie(event, "line_login_state");

  // LINE Login: code → access token
  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${getRequestURL(event).origin}/api/register/callback`,
      client_id: config.public.lineLoginChannelId,
      client_secret: config.lineLoginChannelSecret,
    }),
  });
  if (!tokenRes.ok) {
    return sendRedirect(event, "/register?error=token_exchange_failed");
  }
  const tokenData = (await tokenRes.json()) as { access_token: string };

  // LINE Profile 取得 → lineUserId
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileRes.ok) {
    return sendRedirect(event, "/register?error=profile_fetch_failed");
  }
  const profile = (await profileRes.json()) as {
    userId: string;
    displayName: string;
    pictureUrl?: string;
  };
  const lineUserId = profile.userId;

  const db = useAdminFirestore();
  const adminAuth = getAuth(useAdminApp());

  // すでに登録済みか確認
  const existing = await db
    .collection("users")
    .where("lineUserId", "==", lineUserId)
    .limit(1)
    .get();

  if (!existing.empty) {
    return sendRedirect(event, "/register?status=already_registered");
  }

  // Firebase Auth ユーザー作成（displayName を初期名として使用）
  const fbUser = await adminAuth.createUser({
    displayName: profile.displayName,
    photoURL: profile.pictureUrl,
  });

  // Firestore に users ドキュメント作成
  await db.collection("users").doc(fbUser.uid).set({
    uid: fbUser.uid,
    lineUserId,
    name: profile.displayName,
    email: "",
    role: "member",
    shiftType: "default",
    createdAt: new Date(),
  });

  return sendRedirect(
    event,
    `/register?status=success&name=${encodeURIComponent(profile.displayName)}`,
  );
});
