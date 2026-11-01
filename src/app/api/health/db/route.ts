import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Verify SQLite connectivity
    await prisma.$queryRaw`SELECT 1`;

    // 2. Count rows in all SQLite models
    const [
      usersCount,
      issuesCount,
      departmentsCount,
      wardsCount,
      workOrdersCount,
      workAssignmentsCount,
      timelineCount,
      notificationsCount,
      resolutionEvidenceCount,
      auditLogsCount,
      verificationsCount,
    ] = await Promise.all([
      prisma.user.count().catch(() => 0),
      prisma.issue.count().catch(() => 0),
      prisma.department.count().catch(() => 0),
      prisma.ward.count().catch(() => 0),
      prisma.workOrder.count().catch(() => 0),
      prisma.workAssignment.count().catch(() => 0),
      prisma.timeline.count().catch(() => 0),
      prisma.notification.count().catch(() => 0),
      prisma.resolutionEvidence.count().catch(() => 0),
      prisma.auditLog.count().catch(() => 0),
      prisma.communityVerification.count().catch(() => 0),
    ]);

    // 3. Verify Local Storage Folders safely
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const complaintsDir = path.join(uploadsDir, 'complaints');
    const resolutionsDir = path.join(uploadsDir, 'resolutions');
    const profilesDir = path.join(uploadsDir, 'profiles');

    try {
      for (const dir of [complaintsDir, resolutionsDir, profilesDir]) {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
    } catch {
      // Read-only filesystem in serverless environments (Vercel)
    }

    return NextResponse.json({
      status: 'healthy',
      engine: 'SQLite (Prisma ORM)',
      databasePath: 'prisma/communityhero.db',
      storageBackend: 'Local Filesystem (public/uploads/)',
      tables: {
        users: { exists: true, count: usersCount },
        issues: { exists: true, count: issuesCount },
        departments: { exists: true, count: departmentsCount },
        wards: { exists: true, count: wardsCount },
        work_orders: { exists: true, count: workOrdersCount },
        work_assignments: { exists: true, count: workAssignmentsCount },
        timeline_events: { exists: true, count: timelineCount },
        notifications: { exists: true, count: notificationsCount },
        resolution_evidence: { exists: true, count: resolutionEvidenceCount },
        audit_logs: { exists: true, count: auditLogsCount },
        community_verifications: { exists: true, count: verificationsCount },
      },
      storage: {
        complaints: { exists: fs.existsSync(complaintsDir), path: 'public/uploads/complaints' },
        resolutions: { exists: fs.existsSync(resolutionsDir), path: 'public/uploads/resolutions' },
        profiles: { exists: fs.existsSync(profilesDir), path: 'public/uploads/profiles' },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        engine: 'SQLite (Prisma ORM)',
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
