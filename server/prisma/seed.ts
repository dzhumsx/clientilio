import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  const adminEmail = 'admin@Marketiv.io.com';
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (existingUser) {
    console.log(`ℹ️ User ${adminEmail} already exists. Skipping seed.`);
    return;
  }

  const passwordHash = await bcrypt.hash('Password123!', 12);

  // Create admin user and initial agency organization
  const user = await prisma.user.create({
    data: {
      name: 'Admin Demo',
      email: adminEmail,
      passwordHash,
      emailVerified: true,
    },
  });

  const organization = await prisma.organization.create({
    data: {
      name: 'Agência Marketiv.io Demo',
      slug: 'agencia-Marketiv.io-demo',
      ownerId: user.id,
      planId: 'agency',
      memberships: {
        create: {
          userId: user.id,
          role: 'OWNER',
        },
      },
    },
  });

  // Create a sample client
  const client = await prisma.client.create({
    data: {
      organizationId: organization.id,
      name: 'Empresa Exemplo Ltda',
      email: 'contato@empresaexemplo.com.br',
      company: 'Empresa Exemplo',
      notes: 'Cliente de demonstração inicial do sistema.',
      createdById: user.id,
    },
  });

  // Create a sample project
  const project = await prisma.project.create({
    data: {
      organizationId: organization.id,
      clientId: client.id,
      name: 'Redesign de Identidade Visual & Website',
      description: 'Criação de nova identidade visual e portal institucional.',
      status: 'ACTIVE',
      category: 'Design & Desenvolvimento',
      createdById: user.id,
    },
  });

  // Create a sample task
  await prisma.task.create({
    data: {
      organizationId: organization.id,
      projectId: project.id,
      title: 'Aprovar paleta de cores e tipografia',
      description: 'Revisão inicial do manual de marca com o cliente.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      createdById: user.id,
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log(`👤 Admin login: ${adminEmail}`);
  console.log('🔑 Password: Password123!');
  console.log(`🏢 Organization: ${organization.name}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
