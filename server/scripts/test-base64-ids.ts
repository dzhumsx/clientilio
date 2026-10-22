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
  console.log('🧪 Validação de Prefixos de 1 Letra e Comprimentos Base64:');
  console.log('   • u_xxxxxx (Usuário: 1 letra + 6 dígitos)');
  console.log('   • o_xxxxxx (Agência: 1 letra + 6 dígitos)');
  console.log('   • c_xxxxxx (Cliente: 1 letra + 6 dígitos)');
  console.log('   • p_xxxxxxxx (Projeto: 1 letra + 8 dígitos)');
  console.log('   • d_xxxxxxxx (Entregável: 1 letra + 8 dígitos)\n');

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
  const userDigits = userId.replace('u_', '');
  console.log(`   Prefixo: 'u_', Dígitos Base64: ${userDigits.length} ("${userDigits}")`);
  if (!userId.startsWith('u_') || userDigits.length !== 6) {
    throw new Error(`Usuário inválido! Esperado u_xxxxxx (6 dígitos), recebido: ${userId}`);
  }

  console.log('   Agência criada ID:', orgId);
  const orgDigits = orgId.replace('o_', '');
  console.log(`   Prefixo: 'o_', Dígitos Base64: ${orgDigits.length} ("${orgDigits}")`);
  if (!orgId.startsWith('o_') || orgDigits.length !== 6) {
    throw new Error(`Agência inválida! Esperado o_xxxxxx (6 dígitos), recebido: ${orgId}`);
  }
  console.log('   ✅ Usuário (u_xxxxxx) e Agência (o_xxxxxx) validados com sucesso!');

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
  const clientDigits = clientId.replace('c_', '');
  console.log(`   Prefixo: 'c_', Dígitos Base64: ${clientDigits.length} ("${clientDigits}")`);
  if (!clientId.startsWith('c_') || clientDigits.length !== 6) {
    throw new Error(`Cliente inválido! Esperado c_xxxxxx (6 dígitos), recebido: ${clientId}`);
  }
  console.log('   ✅ Cliente (c_xxxxxx) validado com sucesso!');

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
  const projectDigits = projectId.replace('p_', '');
  console.log(`   Prefixo: 'p_', Dígitos Base64: ${projectDigits.length} ("${projectDigits}")`);
  if (!projectId.startsWith('p_') || projectDigits.length !== 8) {
    throw new Error(`Projeto inválido! Esperado p_xxxxxxxx (8 dígitos), recebido: ${projectId}`);
  }
  console.log('   ✅ Projeto (p_xxxxxxxx) validado com sucesso!');

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
  const deliverableDigits = deliverableId.replace('d_', '');
  console.log(`   Prefixo: 'd_', Dígitos Base64: ${deliverableDigits.length} ("${deliverableDigits}")`);
  if (!deliverableId.startsWith('d_') || deliverableDigits.length !== 8) {
    throw new Error(`Entregável inválido! Esperado d_xxxxxxxx (8 dígitos), recebido: ${deliverableId}`);
  }
  console.log('   ✅ Entregável (d_xxxxxxxx) validado com sucesso!');

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
  console.log('🎉 SUCESSO: Todos os prefixos de 1 letra validados:');
  console.log(`  • Usuário:    ${userId}      -> prefixo 'u_', 6 dígitos Base64`);
  console.log(`  • Agência:    ${orgId}      -> prefixo 'o_', 6 dígitos Base64`);
  console.log(`  • Cliente:    ${clientId}      -> prefixo 'c_', 6 dígitos Base64`);
  console.log(`  • Projeto:    ${projectId}    -> prefixo 'p_', 8 dígitos Base64`);
  console.log(`  • Entregável: ${deliverableId}    -> prefixo 'd_', 8 dígitos Base64`);
  console.log(`  • URL Portal: http://localhost:5173/p/${projectId}`);
  console.log('================================================================');
}

run().catch((err) => {
  console.error('❌ Falha:', err);
  process.exit(1);
});
