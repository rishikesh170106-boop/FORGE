import { getProfile } from '@/lib/auth';
import { listNotifications, markNotificationRead } from '@/lib/data';
import { getMyActivity } from '@/lib/repo';
import { supabaseEnabled } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const profile = await getProfile();
  const role = profile?.role || 'CITIZEN';
  const userId = profile?.id;

  const inAppNotifications = await listNotifications(role, userId);

  let activityItems: any[] = [];
  if (supabaseEnabled() && userId) {
    try {
      activityItems = await getMyActivity(userId);
    } catch {
      // safe fallback
    }
  }

  return Response.json({
    notifications: inAppNotifications,
    activity: activityItems,
    unreadCount: inAppNotifications.filter((n) => !n.isRead).length,
  });
}

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (id) await markNotificationRead(id);
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Failed to update notification' }, { status: 400 });
  }
}
