import { getProfile } from '@/lib/auth';
import {
  acceptComplaint,
  reassignComplaint,
  assignWorker,
  workerStartWork,
  workerSubmitResolution,
  officerVerifyResolution,
  citizenConfirmResolution,
  escalateOverdue,
  getIssue,
} from '@/lib/data';
import { verifyResolutionWithAI } from '@/lib/verification';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const profile = await getProfile();
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON request' }, { status: 400 });
  }

  const { action } = body;
  const actorName = profile?.name || body.actorName || 'Authority';

  switch (action) {
    case 'accept': {
      const { complaintId } = body;
      if (!complaintId) return Response.json({ error: 'complaintId is required' }, { status: 400 });
      const updated = await acceptComplaint(complaintId, actorName, profile?.id);
      if (!updated) return Response.json({ error: 'Complaint not found' }, { status: 404 });
      return Response.json({ success: true, issue: updated });
    }

    case 'reassign': {
      const { complaintId, newDepartment, reason } = body;
      if (!complaintId || !newDepartment) {
        return Response.json({ error: 'complaintId and newDepartment are required' }, { status: 400 });
      }
      const updated = await reassignComplaint(complaintId, newDepartment, reason || 'Jurisdictional correction', actorName);
      if (!updated) return Response.json({ error: 'Complaint not found' }, { status: 404 });
      return Response.json({ success: true, issue: updated });
    }

    case 'assign_worker': {
      const { complaintId, workerId, workerName, instructions, deadlineHours } = body;
      if (!complaintId || !workerName) {
        return Response.json({ error: 'complaintId and workerName are required' }, { status: 400 });
      }
      const res = await assignWorker(
        complaintId,
        workerId || 'worker-tech-1',
        workerName,
        instructions || 'Execute required repair and capture after-repair photograph proof.',
        Number(deadlineHours) || 24,
        actorName,
        profile?.id,
      );
      if (!res) return Response.json({ error: 'Complaint not found' }, { status: 404 });
      return Response.json({ success: true, issue: res.issue, workOrder: res.workOrder });
    }

    case 'worker_start': {
      const { workOrderId } = body;
      if (!workOrderId) return Response.json({ error: 'workOrderId is required' }, { status: 400 });
      const wo = await workerStartWork(workOrderId, actorName);
      if (!wo) return Response.json({ error: 'Work order not found' }, { status: 404 });
      return Response.json({ success: true, workOrder: wo });
    }

    case 'worker_submit': {
      const { workOrderId, complaintId, notes, afterPhotoUrl, afterImageBase64 } = body;
      if (!workOrderId || (!afterPhotoUrl && !afterImageBase64)) {
        return Response.json({ error: 'workOrderId and after photo evidence are required' }, { status: 400 });
      }

      // Fetch issue to pass original photo & context to Gemini Vision
      const issue = await getIssue(complaintId || workOrderId);
      const aiVerification = await verifyResolutionWithAI({
        title: issue?.title || 'Civic Repair',
        category: issue?.category || 'Pothole',
        originalImageUrl: issue?.imageDataUrl,
        afterImageUrl: afterPhotoUrl,
        afterImageBase64,
        workerNotes: notes,
      });

      const res = await workerSubmitResolution(
        workOrderId,
        notes || 'Repairs completed by field technician.',
        afterPhotoUrl || (afterImageBase64 ? `data:${afterImageBase64.mimeType};base64,${afterImageBase64.data}` : ''),
        aiVerification,
        actorName,
      );

      return Response.json({
        success: true,
        issue: res.issue,
        workOrder: res.workOrder,
        aiVerification,
      });
    }

    case 'officer_verify': {
      const { complaintId, approved, note } = body;
      if (!complaintId || approved === undefined) {
        return Response.json({ error: 'complaintId and approved boolean are required' }, { status: 400 });
      }
      const updated = await officerVerifyResolution(complaintId, Boolean(approved), note || '', actorName);
      if (!updated) return Response.json({ error: 'Complaint not found' }, { status: 404 });
      return Response.json({ success: true, issue: updated });
    }

    case 'citizen_confirm': {
      const { complaintId, confirmed, feedback } = body;
      if (!complaintId || confirmed === undefined) {
        return Response.json({ error: 'complaintId and confirmed boolean are required' }, { status: 400 });
      }
      const updated = await citizenConfirmResolution(complaintId, Boolean(confirmed), feedback || '', actorName);
      if (!updated) return Response.json({ error: 'Complaint not found' }, { status: 404 });
      return Response.json({ success: true, issue: updated });
    }

    case 'escalate_overdue': {
      const count = await escalateOverdue();
      return Response.json({ success: true, escalatedCount: count });
    }

    default:
      return Response.json({ error: `Unknown workflow action "${action}"` }, { status: 400 });
  }
}

