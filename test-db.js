const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Testing SQLite Database Connection...');
  const users = await prisma.user.count();
  const issues = await prisma.issue.count();
  const departments = await prisma.department.count();
  const wards = await prisma.ward.count();
  const workOrders = await prisma.workOrder.count();
  const timeline = await prisma.timeline.count();
  const notifications = await prisma.notification.count();
  const resolutionEvidence = await prisma.resolutionEvidence.count();
  const auditLogs = await prisma.auditLog.count();

  console.log('--- DATABASE STATUS ---');
  console.log({
    users,
    issues,
    departments,
    wards,
    workOrders,
    timeline,
    notifications,
    resolutionEvidence,
    auditLogs,
  });

  const shaik = await prisma.user.findFirst({
    where: { email: 'shaiksameerbasha072@gmail.com' },
  });
  console.log('Shaik User Profile in SQLite:', shaik);

  const sampleIssue = await prisma.issue.findFirst({
    include: { timeline: true },
  });
  console.log('Sample Issue in SQLite:', sampleIssue?.ref, sampleIssue?.title);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

