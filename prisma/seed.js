const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting local database seed...');

  // 1. Seed Wards
  const wards = [
    { id: 'ward-101', name: 'Indiranagar', zone: 'East Zone', lat: 12.9784, lng: 77.6408, supervisorName: 'K. N. Murthy', contactNumber: '+91 80 2297 5601' },
    { id: 'ward-102', name: 'Koramangala', zone: 'South Zone', lat: 12.9352, lng: 77.6245, supervisorName: 'V. Venkatesh', contactNumber: '+91 80 2297 5602' },
    { id: 'ward-103', name: 'Whitefield', zone: 'Mahadevapura Zone', lat: 12.9698, lng: 77.7499, supervisorName: 'P. Srinivas', contactNumber: '+91 80 2297 5603' },
    { id: 'ward-104', name: 'HSR Layout', zone: 'Bommanahalli Zone', lat: 12.9121, lng: 77.6446, supervisorName: 'S. Jayaram', contactNumber: '+91 80 2297 5604' },
    { id: 'ward-105', name: 'Jayanagar', zone: 'South Zone', lat: 12.9308, lng: 77.5838, supervisorName: 'M. Nagaraj', contactNumber: '+91 80 2297 5605' },
    { id: 'ward-106', name: 'Malleshwaram', zone: 'West Zone', lat: 12.9982, lng: 77.5704, supervisorName: 'R. Chandrashekar', contactNumber: '+91 80 2297 5606' },
  ];

  for (const w of wards) {
    await prisma.ward.upsert({
      where: { id: w.id },
      update: w,
      create: w,
    });
  }
  console.log(`✅ Seeded ${wards.length} municipal wards.`);

  // 2. Seed Departments
  const departments = [
    { id: 'dept-road', name: 'Road Maintenance', headName: 'Chief Engineer (Roads)', contactEmail: 'roads@city.gov', slaHours: 24 },
    { id: 'dept-water', name: 'Water Supply', headName: 'Executive Engineer (Water Supply)', contactEmail: 'water@city.gov', slaHours: 12 },
    { id: 'dept-drain', name: 'Drainage', headName: 'Superintending Engineer (SWD)', contactEmail: 'drainage@city.gov', slaHours: 18 },
    { id: 'dept-sanit', name: 'Sanitation', headName: 'Joint Commissioner (Solid Waste)', contactEmail: 'sanitation@city.gov', slaHours: 8 },
    { id: 'dept-elec', name: 'Electrical Department', headName: 'Superintending Engineer (Elec)', contactEmail: 'electrical@city.gov', slaHours: 12 },
    { id: 'dept-pwd', name: 'Public Works', headName: 'Chief Engineer (General Works)', contactEmail: 'publicworks@city.gov', slaHours: 48 },
    { id: 'dept-ctrl', name: 'Municipal Control Desk', headName: 'Municipal Commissioner', contactEmail: 'admin@city.gov', slaHours: 6 },
  ];

  for (const d of departments) {
    await prisma.department.upsert({
      where: { id: d.id },
      update: d,
      create: d,
    });
  }
  console.log(`✅ Seeded ${departments.length} municipal departments.`);

  // 3. Seed Demo Users for all 4 roles
  const defaultPasswordHash = await bcrypt.hash('CivicHero2026!', 10);
  const officerHash = await bcrypt.hash('Officer123!', 10);
  const workerHash = await bcrypt.hash('Worker123!', 10);
  const adminHash = await bcrypt.hash('Admin123!', 10);
  const citizenHash = await bcrypt.hash('Citizen123!', 10);

  const demoUsers = [
    // 1. Citizen Accounts
    {
      id: 'usr-citizen-shaik',
      email: 'shaiksameerbasha072@gmail.com',
      password: citizenHash,
      name: 'shaiksameerbasha072',
      role: 'CITIZEN',
      avatar: '🧑',
      points: 120,
      reportsCount: 3,
      verificationsCount: 5,
      resolvedImpact: 2,
      isDemo: false,
    },
    {
      id: 'usr-citizen-demo',
      email: 'citizen@city.gov',
      password: citizenHash,
      name: 'Priya Sharma (Active Citizen)',
      role: 'CITIZEN',
      avatar: '👩',
      points: 80,
      reportsCount: 2,
      verificationsCount: 3,
      resolvedImpact: 1,
      isDemo: true,
    },
    // 2. Department Officer Accounts
    {
      id: 'usr-officer-road',
      email: 'officer@city.gov',
      password: officerHash,
      name: 'Engineer Ramesh Kumar',
      role: 'DEPARTMENT_OFFICER',
      avatar: '👷‍♂️',
      departmentId: 'dept-road',
      wardId: 'ward-101',
      badgeNumber: 'RO-504',
      designation: 'Executive Engineer (Road Maintenance)',
      isDemo: true,
    },
    {
      id: 'usr-officer-sanit',
      email: 'sanitation.officer@city.gov',
      password: officerHash,
      name: 'Ananya Deshmukh',
      role: 'DEPARTMENT_OFFICER',
      avatar: '👩‍💼',
      departmentId: 'dept-sanit',
      wardId: 'ward-102',
      badgeNumber: 'SO-112',
      designation: 'Ward Health Inspector',
      isDemo: true,
    },
    // 3. Field Worker Accounts
    {
      id: 'usr-worker-road',
      email: 'worker@city.gov',
      password: workerHash,
      name: 'Anand Kumar (Road Repair Specialist)',
      role: 'FIELD_WORKER',
      avatar: '🔧',
      departmentId: 'dept-road',
      wardId: 'ward-101',
      badgeNumber: 'FW-901',
      designation: 'Senior Road Crew Lead',
      isDemo: true,
    },
    {
      id: 'usr-worker-elec',
      email: 'worker.elec@city.gov',
      password: workerHash,
      name: 'Deepak Rao',
      role: 'FIELD_WORKER',
      avatar: '⚡',
      departmentId: 'dept-elec',
      wardId: 'ward-101',
      badgeNumber: 'FW-402',
      designation: 'Streetlight Technician',
      isDemo: true,
    },
    // 4. Municipal Admin Account
    {
      id: 'usr-admin-municipal',
      email: 'admin@city.gov',
      password: adminHash,
      name: 'Commissioner S. Sharma',
      role: 'MUNICIPAL_ADMIN',
      avatar: '🏛️',
      badgeNumber: 'IAS-01',
      designation: 'Municipal Commissioner & Control Desk Chief',
      isDemo: true,
    },
  ];

  for (const u of demoUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: u,
      create: u,
    });
  }
  console.log(`✅ Seeded ${demoUsers.length} users across CITIZEN, DEPARTMENT_OFFICER, FIELD_WORKER, and MUNICIPAL_ADMIN.`);

  // 4. Seed an initial sample complaint so all dashboards have initial data to display
  const sampleRef = 'CH-1001';
  const now = new Date();
  const deadline = new Date(now.getTime() + 24 * 3600_000);

  const sampleIssue = await prisma.issue.upsert({
    where: { ref: sampleRef },
    update: {},
    create: {
      ref: sampleRef,
      title: 'Deep pothole on 100ft Road near 12th Main junction',
      description: 'Severe road depression approximately 15cm deep causing vehicular slow-downs and risk of two-wheeler accidents.',
      category: 'Pothole',
      severity: 'High',
      status: 'Acknowledged',
      detailedStatus: 'ACCEPTED',
      priority: 85,
      confidence: 0.94,
      safetyRisk: 'High risk to two-wheelers in wet conditions',
      tags: JSON.stringify(['pothole', 'road_hazard', 'indiranagar']),
      location: '100ft Road, HAL 2nd Stage, Indiranagar, Bengaluru',
      lat: 12.9784,
      lng: 77.6408,
      departmentId: 'dept-road',
      departmentName: 'Road Maintenance',
      wardId: 'ward-101',
      wardName: 'Indiranagar',
      slaHours: 24,
      resolutionDeadline: deadline,
      workOrderId: 'WO-5201',
      assignedOfficerId: 'usr-officer-road',
      assignedOfficerName: 'Engineer Ramesh Kumar',
      assignedWorkerId: 'usr-worker-road',
      assignedWorkerName: 'Anand Kumar (Road Repair Specialist)',
      advisory: 'Road maintenance unit dispatched. Motorists advised caution.',
      imageUrl: '/uploads/complaints/sample-pothole.jpg',
      reporterId: 'usr-citizen-shaik',
      reporterName: 'shaiksameerbasha072',
      verificationsCount: 3,
      createdAt: now,
      updatedAt: now,
    },
  });

  // Seed sample work order
  await prisma.workOrder.upsert({
    where: { id: 'WO-5201' },
    update: {},
    create: {
      id: 'WO-5201',
      complaintId: sampleIssue.id,
      departmentId: 'dept-road',
      departmentName: 'Road Maintenance',
      officerId: 'usr-officer-road',
      officerName: 'Engineer Ramesh Kumar',
      workerId: 'usr-worker-road',
      workerName: 'Anand Kumar (Road Repair Specialist)',
      status: 'Assigned',
      instructions: 'Cold mix asphalt patch required. Complete within 24 hours.',
      deadline: deadline,
      beforePhotoUrl: '/uploads/complaints/sample-pothole.jpg',
      createdAt: now,
      updatedAt: now,
    },
  });

  // Seed sample timeline
  await prisma.timeline.createMany({
    data: [
      { issueId: sampleIssue.id, status: 'SUBMITTED', note: 'Complaint filed by citizen with photo evidence.', actor: 'shaiksameerbasha072', createdAt: now },
      { issueId: sampleIssue.id, status: 'ROUTED', note: 'AI Vision triaged: Pothole detected (94% confidence) -> Routed to Road Maintenance.', actor: 'Civic Routing Engine', createdAt: now },
      { issueId: sampleIssue.id, status: 'ACCEPTED', note: 'Complaint accepted by Officer Engineer Ramesh Kumar.', actor: 'Engineer Ramesh Kumar', createdAt: now },
    ],
  }).catch(() => {});

  // Seed sample notification
  await prisma.notification.create({
    data: {
      userId: 'usr-citizen-shaik',
      role: 'CITIZEN',
      title: 'Complaint Accepted',
      message: 'Your reported pothole on 100ft Road has been accepted by Road Maintenance.',
      type: 'OFFICER_ACCEPTED',
      complaintId: sampleIssue.id,
      isRead: false,
      createdAt: now,
    },
  }).catch(() => {});

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

