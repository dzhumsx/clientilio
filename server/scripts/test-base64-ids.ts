const API_BASE = 'http://localhost:3000/api';

async function request(url: string, options: any = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const res = await fetch(`${API_BASE}${url}`, {
    method: options.method || 'GET',
    headers,
    body,
  });

  let data: any = null;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('🧪 Validação de Prefixos de 1 Letra e Comprimentos Base64 (Sem Sublinhado):');
  console.log('   • uxxxxxx (Usuário: 1 letra + 6 dígitos)');
  console.log('   • oxxxxxx (Agência: 1 letra + 6 dígitos)');
  console.log('   • cxxxxxx (Cliente: 1 letra + 6 dígitos)');
  console.log('   • pxxxxxxxx (Projeto: 1 letra + 8 dígitos)');
  console.log('   • dxxxxxxxx (Entregável: 1 letra + 8 dígitos)\n');

  const suffix = Math.random().toString(36).substring(2, 8);
  const email = `single_letter_${suffix}@agenciadigital.com`;

  // 1. Cadastrar Usuário e Agência
  const regRes = await request('/auth/register', {
    method: 'POST',
    body: {
      name: 'Fundador da Agência',
      email,
      password: 'StrongPassword123!',
      companyName: 'Agência Criativa Alpha',
      createAgency: true,
    },
  });

  if (!regRes.ok) {
    throw new Error(`Falha no registro: ${JSON.stringify(regRes.data)}`);
  }

  const userId = regRes.data.user.id;
  const orgId = regRes.data.organizations[0]?.id;
  const token = regRes.data.accessToken || regRes.data.tokens?.accessToken;

  console.log('1. Usuário criado ID:', userId);
  const userDigits = userId.startsWith('u') ? userId.slice(1) : userId;
  console.log(`   Prefixo: 'u', Dígitos Base64: ${userDigits.length} ("${userDigits}")`);
  if (!userId.startsWith('u') || userId.includes('_') || userDigits.length !== 6) {
    throw new Error(`Usuário inválido! Esperado uxxxxxx (6 dígitos, sem _), recebido: ${userId}`);
  }

  console.log('   Agência criada ID:', orgId);
  const orgDigits = orgId.startsWith('o') ? orgId.slice(1) : orgId;
  console.log(`   Prefixo: 'o', Dígitos Base64: ${orgDigits.length} ("${orgDigits}")`);
  if (!orgId.startsWith('o') || orgId.includes('_') || orgDigits.length !== 6) {
    throw new Error(`Agência inválida! Esperado oxxxxxx (6 dígitos, sem _), recebido: ${orgId}`);
  }
  console.log('   ✅ Usuário (uxxxxxx) e Agência (oxxxxxx) validados com sucesso!');

  // 2. Criar Cliente na Agência
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'x-organization-id': orgId,
  };

  const clientRes = await request('/clients', {
    method: 'POST',
    headers: authHeaders,
    body: {
      name: 'Cliente Premium',
      email: `client_${suffix}@empresa.com`,
      company: 'Empresa do Cliente',
    },
  });

  if (!clientRes.ok) {
    throw new Error(`Falha ao criar cliente: ${JSON.stringify(clientRes.data)}`);
  }

  const clientId = clientRes.data.id;
  console.log('\n2. Cliente criado ID:', clientId);
  const clientDigits = clientId.startsWith('c') ? clientId.slice(1) : clientId;
  console.log(`   Prefixo: 'c', Dígitos Base64: ${clientDigits.length} ("${clientDigits}")`);
  if (!clientId.startsWith('c') || clientId.includes('_') || clientDigits.length !== 6) {
    throw new Error(`Cliente inválido! Esperado cxxxxxx (6 dígitos, sem _), recebido: ${clientId}`);
  }
  console.log('   ✅ Cliente (cxxxxxx) validado com sucesso!');

  // 3. Criar Projeto para o Cliente
  const projectRes = await request('/projects', {
    method: 'POST',
    headers: authHeaders,
    body: {
      clientId,
      name: 'Design System & Landing Page',
      description: 'Projeto de design e arquitetura de marca',
      category: 'UI/UX & Branding',
    },
  });

  if (!projectRes.ok) {
    throw new Error(`Falha ao criar projeto: ${JSON.stringify(projectRes.data)}`);
  }

  const projectId = projectRes.data.id;
  console.log('\n3. Projeto criado ID:', projectId);
  const projectDigits = projectId.startsWith('p') ? projectId.slice(1) : projectId;
  console.log(`   Prefixo: 'p', Dígitos Base64: ${projectDigits.length} ("${projectDigits}")`);
  if (!projectId.startsWith('p') || projectId.includes('_') || projectDigits.length !== 8) {
    throw new Error(`Projeto inválido! Esperado pxxxxxxxx (8 dígitos, sem _), recebido: ${projectId}`);
  }
  console.log('   ✅ Projeto (pxxxxxxxx) validado com sucesso!');

  // 4. Criar Entregável para o Projeto
  const deliverableRes = await request('/deliverables', {
    method: 'POST',
    headers: authHeaders,
    body: {
      projectId,
      title: 'Design System Figma v1',
      description: 'Guia de estilos e tokens de design',
      type: 'DOCUMENT',
      clientVisible: true,
    },
  });

  if (!deliverableRes.ok) {
    throw new Error(`Falha ao criar entregável: ${JSON.stringify(deliverableRes.data)}`);
  }

  const deliverableId = deliverableRes.data.id;
  console.log('\n4. Entregável criado ID:', deliverableId);
  const deliverableDigits = deliverableId.startsWith('d') ? deliverableId.slice(1) : deliverableId;
  console.log(`   Prefixo: 'd', Dígitos Base64: ${deliverableDigits.length} ("${deliverableDigits}")`);
  if (!deliverableId.startsWith('d') || deliverableId.includes('_') || deliverableDigits.length !== 8) {
    throw new Error(`Entregável inválido! Esperado dxxxxxxxx (8 dígitos, sem _), recebido: ${deliverableId}`);
  }
  console.log('   ✅ Entregável (dxxxxxxxx) validado com sucesso!');

  // 5. Acessar Portal do Cliente via ID do Projeto com prefixo de 1 letra
  const portalRes = await request(`/portal/${projectId}`);
  if (!portalRes.ok) {
    throw new Error(`Falha ao carregar portal via ID ${projectId}: ${JSON.stringify(portalRes.data)}`);
  }
  console.log('\n5. Portal do Cliente acessado com sucesso via ID do Projeto:');
  console.log(`   URL do Portal: http://localhost:5173/p/${projectId}`);
  console.log(`   Projeto: "${portalRes.data.project.name}" (ID: ${portalRes.data.project.id})`);
  console.log(`   Entregável: "${portalRes.data.deliverables[0]?.title}" (ID: ${portalRes.data.deliverables[0]?.id})`);

  console.log('\n================================================================');
  console.log('🎉 SUCESSO: Todos os prefixos de 1 letra validados sem sublinhado (_):');
  console.log(`  • Usuário:    ${userId}      -> prefixo 'u', 6 dígitos Base64`);
  console.log(`  • Agência:    ${orgId}      -> prefixo 'o', 6 dígitos Base64`);
  console.log(`  • Cliente:    ${clientId}      -> prefixo 'c', 6 dígitos Base64`);
  console.log(`  • Projeto:    ${projectId}    -> prefixo 'p', 8 dígitos Base64`);
  console.log(`  • Entregável: ${deliverableId}    -> prefixo 'd', 8 dígitos Base64`);
  console.log(`  • URL Portal: http://localhost:5173/p/${projectId}`);
  console.log('================================================================');
}

run().catch((err) => {
  console.error('❌ Falha:', err);
  process.exit(1);
});
