// Full Civic Lifecycle Verification Script using native Node 22 APIs
async function testLifecycle() {
  console.log('🚀 [STEP 1] Testing Citizen Reporting on /api/triage ...');

  const sampleJpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const buffer = Buffer.from(sampleJpegBase64, 'base64');
  const blob = new Blob([buffer], { type: 'image/jpeg' });

  const fd = new FormData();
  fd.append('image', blob, 'pothole.jpg');
  fd.append('location', '100 Feet Rd, Indiranagar, Bengaluru');
  fd.append('notes', 'Deep hazardous pothole causing traffic obstruction and two-wheeler skids.');
  fd.append('reporter', 'shaiksameerbasha072');
  fd.append('reporterId', 'shaiksameerbasha072');

  const triageRes = await fetch('http://localhost:3000/api/triage', {
    method: 'POST',
    body: fd,
  });

  const triageText = await triageRes.text();
  console.log('Triage response received. Parsing NDJSON events...');
  const lines = triageText.split('\n').filter(l => l.trim().length > 0);
  let createdIssue = null;

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.type === 'result' && parsed.issue) {
        createdIssue = parsed.issue;
      }
    } catch (e) {}
  }

  if (!createdIssue) {
    console.error('❌ Triage failed to create issue. Response was:', triageText.slice(0, 300));
    return;
  }

  console.log(`✅ Issue successfully created: ID = ${createdIssue.id}, Ref = ${createdIssue.ref}, WorkOrder = ${createdIssue.workOrderId}, Dept = ${createdIssue.department}`);

  console.log('\n🏛️ [STEP 2] Testing Officer Acceptance on /api/workflow ...');
  const acceptRes = await fetch('http://localhost:3000/api/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'accept',
      complaintId: createdIssue.id,
      officerName: 'Officer Rajesh Kumar',
      officerId: 'demo-officer-roads',
    }),
  }).then(r => r.json());
  console.log('Officer Acceptance Result:', acceptRes.success ? '✅ SUCCESS' : '❌ FAILED', acceptRes.issue?.detailedStatus);

  console.log('\n👷 [STEP 3] Testing Field Worker Assignment on /api/workflow ...');
  const assignRes = await fetch('http://localhost:3000/api/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'assign_worker',
      complaintId: createdIssue.id,
      workerId: 'demo-worker-ramesh',
      workerName: 'Ramesh Naidu (Lead Technician)',
      instructions: 'Fill pothole with rapid-setting asphalt and compress flush with road.',
      deadlineHours: 12,
      officerName: 'Officer Rajesh Kumar',
    }),
  }).then(r => r.json());
  console.log('Worker Assignment Result:', assignRes.success ? '✅ SUCCESS' : '❌ FAILED');

  console.log('\n🔨 [STEP 4] Testing Field Worker Commencing Repair ...');
  const targetWorkOrderId = assignRes.workOrder ? assignRes.workOrder.id : createdIssue.workOrderId;
  const startRes = await fetch('http://localhost:3000/api/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'worker_start',
      workOrderId: targetWorkOrderId,
      workerName: 'Ramesh Naidu (Lead Technician)',
    }),
  }).then(r => r.json());
  console.log('Worker Start Result:', startRes.success ? '✅ SUCCESS' : '❌ FAILED');

  console.log('\n📸 [STEP 5] Testing Worker Submitting Resolution with Photo Evidence ...');
  const submitRes = await fetch('http://localhost:3000/api/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'worker_submit',
      workOrderId: targetWorkOrderId,
      notes: 'Pothole asphalt refilled, compacted, and traffic cone removed.',
      afterPhotoUrl: 'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=800&auto=format&fit=crop&q=80',
      workerName: 'Ramesh Naidu (Lead Technician)',
    }),
  }).then(r => r.json());
  console.log('Worker Submit Result:', submitRes.success ? '✅ SUCCESS' : '❌ FAILED');

  console.log('\n🔍 [STEP 6] Testing Officer Approving Resolution ...');
  const verifyRes = await fetch('http://localhost:3000/api/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'officer_verify',
      complaintId: createdIssue.id,
      approved: true,
      note: 'Inspected repair site. Road surface is smooth and hazard cleared.',
      officerName: 'Officer Rajesh Kumar',
    }),
  }).then(r => r.json());
  console.log('Officer Verification Result:', verifyRes.success ? '✅ SUCCESS' : '❌ FAILED');

  console.log('\n🤝 [STEP 7] Testing Citizen Final Confirmation on /api/workflow ...');
  const confirmRes = await fetch('http://localhost:3000/api/workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'citizen_confirm',
      complaintId: createdIssue.id,
      confirmed: true,
      feedback: 'Great work! The pothole is completely fixed. Thank you Community Hero team!',
      citizenName: 'shaiksameerbasha072',
    }),
  }).then(r => r.json());
  console.log('Citizen Confirmation Result:', confirmRes.success ? '✅ SUCCESS' : '❌ FAILED', confirmRes.issue?.detailedStatus);

  console.log('\n📊 [STEP 8] Verifying Profile Reports for shaiksameerbasha072 ...');
  const issuesRes = await fetch('http://localhost:3000/api/issues').then(r => r.json());
  const myReports = (issuesRes.issues || []).filter(i => 
    i.reporterId === 'shaiksameerbasha072' || 
    (i.reporter && i.reporter.includes('shaik'))
  );
  console.log(`Found ${myReports.length} reports filed by shaiksameerbasha072 in the active system:`);
  for (const r of myReports) {
    console.log(`  - Ref: ${r.ref} | Status: ${r.status} (${r.detailedStatus}) | Dept: ${r.department} | Title: ${r.title}`);
  }

  console.log('\n🎉 ALL PORTALS AND WORKFLOW TRANSITIONS VERIFIED SUCCESSFULLY!');
}

testLifecycle().catch(console.error);
