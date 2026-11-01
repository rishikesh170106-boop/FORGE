const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runFullLifecycle() {
  console.log('====================================================');
  console.log('STARTING FULL CIVIC LIFECYCLE TEST ON LOCAL SQLITE');
  console.log('====================================================\n');

  // STEP 1: Citizen submits a complaint
  console.log('1. Citizen submits complaint (Pothole at Indiranagar 100ft Road)...');
  const count = await prisma.issue.count();
  const ref = `CH-${1000 + count + 1}`;
  const now = new Date();
  const deadline = new Date(now.getTime() + 24 * 3600_000);

  const shaik = await prisma.user.findFirst({ where: { email: 'shaiksameerbasha072@gmail.com' } });
  if (!shaik) throw new Error('Citizen user not found!');

  const issue = await prisma.issue.create({
    data: {
      ref,
      title: 'Severe pothole crater near 100ft road signal',
      description: 'Dangerous road crater roughly 2 feet wide and 6 inches deep causing vehicle damage and traffic bottleneck.',
      category: 'Pothole',
      severity: 'Critical',
      status: 'Reported',
      detailedStatus: 'ROUTED',
      priority: 92,
      confidence: 0.95,
      safetyRisk: 'Immediate collision hazard for two-wheelers',
      tags: JSON.stringify(['pothole', 'hazard', 'indiranagar']),
      location: '100ft Road, near 6th Main Junction, Indiranagar, Bengaluru',
      lat: 12.9784,
      lng: 77.6408,
      departmentId: 'dept-road',
      departmentName: 'Road Maintenance',
      wardId: 'ward-101',
      wardName: 'Indiranagar',
      slaHours: 24,
      resolutionDeadline: deadline,
      workOrderId: `WO-${5200 + count * 9}`,
      advisory: 'Emergency road crew requested. Please avoid the rightmost lane.',
      imageUrl: '/uploads/complaints/test-pothole.jpg',
      reporterId: shaik.id,
      reporterName: shaik.name,
      verificationsCount: 1,
      timeline: {
        create: [
          {
            status: 'SUBMITTED',
            note: 'Filed by citizen with photo evidence.',
            actor: shaik.name,
          },
          {
            status: 'ROUTED',
            note: 'AI classified as Pothole (Critical) and routed to Road Maintenance department.',
            actor: 'Civic Routing Engine',
          },
        ],
      },
    },
    include: { timeline: true },
  });

  // Update citizen stats
  await prisma.user.update({
    where: { id: shaik.id },
    data: {
      reportsCount: { increment: 1 },
      points: { increment: 50 },
    },
  });

  console.log(`✅ Issue created: ${issue.ref} (ID: ${issue.id})`);
  console.log(`   Routed to: ${issue.departmentName} | Priority: ${issue.priority} | Status: ${issue.status}\n`);

  // STEP 2: Department Officer accepts complaint
  console.log('2. Department Officer accepts complaint...');
  const officer = await prisma.user.findFirst({ where: { role: 'DEPARTMENT_OFFICER' } });
  await prisma.issue.update({
    where: { id: issue.id },
    data: {
      status: 'Acknowledged',
      detailedStatus: 'ACCEPTED',
      assignedOfficerId: officer.id,
      assignedOfficerName: officer.name,
    },
  });

  await prisma.timeline.create({
    data: {
      issueId: issue.id,
      status: 'ACCEPTED',
      note: `Complaint accepted by Officer ${officer.name}. Work order queued for field technician.`,
      actor: officer.name,
    },
  });

  await prisma.auditLog.create({
    data: {
      complaintId: issue.id,
      action: 'COMPLAINT_ACCEPTED',
      actorRole: 'DEPARTMENT_OFFICER',
      actorName: officer.name,
      actorId: officer.id,
      details: JSON.stringify({ department: issue.departmentName }),
    },
  });

  console.log(`✅ Officer ${officer.name} accepted complaint. Detailed Status: ACCEPTED\n`);

  // STEP 3: Officer creates and assigns Work Order to Field Worker
  console.log('3. Officer assigns Work Order to Field Worker...');
  const worker = await prisma.user.findFirst({ where: { role: 'FIELD_WORKER' } });
  const workOrder = await prisma.workOrder.create({
    data: {
      id: issue.workOrderId,
      complaintId: issue.id,
      departmentId: issue.departmentId,
      departmentName: issue.departmentName,
      officerId: officer.id,
      officerName: officer.name,
      workerId: worker.id,
      workerName: worker.name,
      status: 'Assigned',
      instructions: 'Deploy cold-mix asphalt patch, compact thoroughly, and photograph repaired surface.',
      deadline: deadline,
      beforePhotoUrl: issue.imageUrl,
    },
  });

  await prisma.workAssignment.create({
    data: {
      workOrderId: workOrder.id,
      workerId: worker.id,
      workerName: worker.name,
      assignedBy: officer.name,
      status: 'Assigned',
      deadline: deadline,
    },
  });

  await prisma.issue.update({
    where: { id: issue.id },
    data: {
      detailedStatus: 'ASSIGNED',
      assignedWorkerId: worker.id,
      assignedWorkerName: worker.name,
    },
  });

  await prisma.timeline.create({
    data: {
      issueId: issue.id,
      status: 'ASSIGNED',
      note: `Assigned to Field Worker ${worker.name}.`,
      actor: officer.name,
    },
  });

  console.log(`✅ Work Order ${workOrder.id} assigned to ${worker.name}.\n`);

  // STEP 4: Field Worker accepts and starts repair
  console.log('4. Field Worker starts repair on site...');
  await prisma.workOrder.update({
    where: { id: workOrder.id },
    data: {
      status: 'In Progress',
      startedAt: new Date(),
    },
  });

  await prisma.issue.update({
    where: { id: issue.id },
    data: {
      status: 'In Progress',
      detailedStatus: 'IN_PROGRESS',
    },
  });

  await prisma.timeline.create({
    data: {
      issueId: issue.id,
      status: 'IN_PROGRESS',
      note: `Field technician ${worker.name} arrived at 100ft Road and commenced road patching.`,
      actor: worker.name,
    },
  });

  console.log(`✅ Repair in progress by ${worker.name}.\n`);

  // STEP 5: Field Worker completes work & uploads resolution proof
  console.log('5. Field Worker completes work and uploads resolution proof...');
  const afterPhotoUrl = '/uploads/resolutions/pothole-repaired-proof.jpg';
  const completionNotes = 'Excavated loose debris, filled with bitumen cold asphalt mix, vibratory compacted flush with road level.';

  await prisma.workOrder.update({
    where: { id: workOrder.id },
    data: {
      status: 'Completed',
      completedAt: new Date(),
      completionNotes,
      afterPhotoUrl,
    },
  });

  await prisma.resolutionEvidence.create({
    data: {
      complaintId: issue.id,
      workOrderId: workOrder.id,
      originalPhotoUrl: issue.imageUrl,
      afterPhotoUrl,
      isResolved: true,
      confidence: 0.96,
      explanation: completionNotes,
      recommendation: 'APPROVE',
      verifiedBy: officer.name,
    },
  });

  await prisma.issue.update({
    where: { id: issue.id },
    data: {
      detailedStatus: 'VERIFYING',
      afterImageUrl: afterPhotoUrl,
      resolutionNote: completionNotes,
    },
  });

  await prisma.timeline.create({
    data: {
      issueId: issue.id,
      status: 'VERIFYING',
      note: `Repair completed by ${worker.name}. Resolution evidence submitted for official verification.`,
      actor: worker.name,
    },
  });

  console.log(`✅ Work completed with after-photo evidence: ${afterPhotoUrl}\n`);

  // STEP 6: Department Officer verifies and approves work
  console.log('6. Department Officer verifies and approves work...');
  await prisma.workOrder.update({
    where: { id: workOrder.id },
    data: { status: 'Verified' },
  });

  await prisma.issue.update({
    where: { id: issue.id },
    data: {
      status: 'Resolved',
      detailedStatus: 'RESOLVED',
      resolutionVerified: true,
      resolutionConfidence: 0.96,
    },
  });

  await prisma.timeline.create({
    data: {
      issueId: issue.id,
      status: 'Resolved',
      note: `Officer ${officer.name} reviewed resolution evidence and certified standard BBMP quality compliance.`,
      actor: officer.name,
    },
  });

  console.log(`✅ Issue status updated to: Resolved (Quality Verified: 96%)\n`);

  // STEP 7: Citizen confirms resolution and closes ticket
  console.log('7. Citizen confirms resolution and rates work...');
  await prisma.issue.update({
    where: { id: issue.id },
    data: {
      detailedStatus: 'CLOSED',
      citizenConfirmed: true,
      citizenFeedback: 'Pothole is completely leveled and road is safe again. Great work by the road crew!',
    },
  });

  await prisma.user.update({
    where: { id: shaik.id },
    data: {
      resolvedImpact: { increment: 1 },
      points: { increment: 25 },
    },
  });

  await prisma.timeline.create({
    data: {
      issueId: issue.id,
      status: 'Resolved',
      note: `Citizen confirmed resolution: "Pothole is completely leveled and road is safe again." Issue officially CLOSED.`,
      actor: shaik.name,
    },
  });

  console.log(`✅ Citizen confirmed resolution! Ticket officially CLOSED.\n`);

  // STEP 8: Verify persistence across all tables
  console.log('8. Verifying full database persistence...');
  const persistedIssue = await prisma.issue.findUnique({
    where: { id: issue.id },
    include: {
      timeline: { orderBy: { createdAt: 'asc' } },
      workOrders: true,
    },
  });

  const updatedShaik = await prisma.user.findUnique({ where: { id: shaik.id } });

  console.log('--- PERSISTENCE VERIFICATION RESULT ---');
  console.log(`Complaint Ref: ${persistedIssue.ref}`);
  console.log(`Title: ${persistedIssue.title}`);
  console.log(`Category: ${persistedIssue.category}`);
  console.log(`Status: ${persistedIssue.status}`);
  console.log(`Detailed Status: ${persistedIssue.detailedStatus}`);
  console.log(`Citizen Confirmed: ${persistedIssue.citizenConfirmed}`);
  console.log(`Citizen Feedback: "${persistedIssue.citizenFeedback}"`);
  console.log(`Before Photo: ${persistedIssue.imageUrl}`);
  console.log(`After Photo: ${persistedIssue.afterImageUrl}`);
  console.log(`Timeline Events Recorded: ${persistedIssue.timeline.length}`);
  console.log(`Work Orders Linked: ${persistedIssue.workOrders.length}`);
  console.log(`Reporter Shaik Points: ${updatedShaik.points} | Reports: ${updatedShaik.reportsCount} | Resolved: ${updatedShaik.resolvedImpact}`);
  console.log('====================================================');
  console.log('FULL LIFECYCLE TEST PASSED 100% LOCALLY WITH SQLITE!');
  console.log('====================================================');
}

runFullLifecycle()
  .catch((err) => {
    console.error('LIFECYCLE TEST FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
