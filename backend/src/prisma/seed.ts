import { prisma } from '../config/database.js';

async function main() {
  console.log('Seeding initial development data...');

  const demoUser = await prisma.user.upsert({
    where: { email: 'reviewer@reachinbox.ai' },
    update: {},
    create: {
      email: 'reviewer@reachinbox.ai',
      name: 'ReachInbox Evaluator',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
  });

  const defaultSender = await prisma.sender.upsert({
    where: { id: 'sender-default-demo' },
    update: {},
    create: {
      id: 'sender-default-demo',
      userId: demoUser.id,
      email: 'outreach@ethereal.email',
      name: 'ReachInbox Outreach Bot',
      isDefault: true,
    },
  });

  console.log(`Seeded user: ${demoUser.email} (id: ${demoUser.id})`);
  console.log(`Seeded sender: ${defaultSender.email} (id: ${defaultSender.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
