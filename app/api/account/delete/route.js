import { NextResponse } from "next/server";
import { serverClient, serviceClient } from "../../../../lib/supabase";

// Hard account deletion.
//
// Deleting the auth user is enough on its own: every table that holds personal
// data hangs off auth.users or profiles with `on delete cascade`, so one delete
// removes the profile, the events they host, their guest rows at other people's
// events, and every bet. That cascade is the reason this is a genuine
// deletion and not a flag on a row.
//
// The caller can only ever delete themselves — the id comes from the verified
// session, never from the request body.
export async function POST() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let admin;
  try {
    admin = serviceClient();
  } catch {
    return NextResponse.json({ error: "deletion_unavailable" }, { status: 503 });
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ deleted: true });
}
