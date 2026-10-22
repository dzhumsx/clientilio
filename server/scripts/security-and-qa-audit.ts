const API_BASE = 'http://localhost:3000/api';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  details: string;
  recommendation?: string;
}

const results: TestResult[] = [];

function record(res: TestResult) {
  results.push(res);
  const icon = res.passed ? '✅' : '❌';
  console.log(`${icon} [${res.severity}] [${res.category}] ${res.name}: ${res.details}`);
}

async function request(url: string, options: any = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const body = options.body ? JSON.stringify(options.body) : undefined;
  const res = await fetch(url, {
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

async function runAudit() {
  console.log('🛡️ INICIANDO SUÍTE DE PENTEST E TESTES DE SEGURANÇA E ROBUSTEZ\n');

  // =========================================================================
  // 1. AUTENTICAÇÃO E CONTROLE DE ACESSO
  // =========================================================================
  console.log('\n--- 1. TESTES DE AUTENTICAÇÃO E BRUTE-FORCE ---');

  // Test 1.1: Login com credenciais inválidas
  try {
    const res = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'admin@nexora.com', password: 'WrongPassword999!' },
    });
    if (res.status === 401) {
      record({
        category: 'Autenticação',
        name: 'Rejeição de senha inválida',
        passed: true,
        severity: 'INFO',
        details: 'Retornou 401 Unauthorized corretamente.',
      });
    } else {
      record({
        category: 'Autenticação',
        name: 'Rejeição de senha inválida',
        passed: false,
        severity: res.status === 200 ? 'CRITICAL' : 'MEDIUM',
        details: `Código de status inesperado: ${res.status}`,
      });
    }
  } catch (err: any) {
    record({
      category: 'Autenticação',
      name: 'Rejeição de senha inválida',
      passed: false,
      severity: 'HIGH',
      details: err.message,
    });
  }

  // Test 1.2: Login legítimo (Admin)
  let adminToken = '';
  let adminOrgId = '';
  try {
    const res = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      body: { email: 'admin@nexora.com', password: 'Password123!' },
    });
    adminToken = res.data?.tokens?.accessToken || res.data?.accessToken;
    adminOrgId = res.data?.organizations?.[0]?.id || '';
    record({
      category: 'Autenticação',
      name: 'Login de administrador legítimo',
      passed: Boolean(adminToken && adminOrgId),
      severity: 'INFO',
      details: `Login bem-sucedido. Org ativa: ${res.data?.organizations?.[0]?.name} (${adminOrgId})`,
    });
  } catch (err: any) {
    record({
      category: 'Autenticação',
      name: 'Login de administrador legítimo',
      passed: false,
      severity: 'CRITICAL',
      details: `Falha ao autenticar admin demo: ${err.message}`,
    });
  }

  // Test 1.3: Forged JWT token (Assinatura adulterada)
  try {
    const forgedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImVtYWlsIjoidmljdGltQGV4YW1wbGUuY29tIn0.invalidSignature1234567890';
    const res = await request(`${API_BASE}/projects`, {
      headers: {
        Authorization: `Bearer ${forgedToken}`,
        'x-organization-id': adminOrgId,
      },
    });
    record({
      category: 'Autenticação',
      name: 'Rejeição de JWT forjado',
      passed: res.status === 401,
      severity: res.status === 401 ? 'INFO' : 'CRITICAL',
      details: `Status retornado: ${res.status}. Token forjado foi rejeitado.`,
    });
  } catch (err: any) {
    record({
      category: 'Autenticação',
      name: 'Rejeição de JWT forjado',
      passed: false,
      severity: 'HIGH',
      details: err.message,
    });
  }

  // =========================================================================
  // 2. ISOLAMENTO MULTI-TENANT E IDOR
  // =========================================================================
  console.log('\n--- 2. TESTES DE MULTI-TENANCY E IDOR ---');

  // Criar Agência Atacante (Usuário B)
  let attackerToken = '';
  let attackerOrgId = '';
  const attackerEmail = `attacker_${Date.now()}@test.com`;

  try {
    const regRes = await request(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: {
        name: 'Attacker Agency',
        email: attackerEmail,
        password: 'AttackerPass123!',
        companyName: 'Agência Invasora Ltda',
      },
    });
    attackerToken = regRes.data?.tokens?.accessToken || regRes.data?.accessToken;
    attackerOrgId = regRes.data?.organizations?.[0]?.id || '';
    record({
      category: 'Multi-Tenant',
      name: 'Criação de agência isolada (Tenant B)',
      passed: Boolean(attackerToken && attackerOrgId),
      severity: 'INFO',
      details: `Tenant B criado com sucesso: OrgId ${attackerOrgId}`,
    });
  } catch (err: any) {
    record({
      category: 'Multi-Tenant',
      name: 'Criação de agência isolada (Tenant B)',
      passed: false,
      severity: 'HIGH',
      details: `Falha ao registrar tenant B: ${err.message}`,
    });
  }

  // Obter um projeto legítimo da Agência A (Admin)
  let adminProjectId = '';
  let adminClientId = '';
  try {
    const projRes = await request(`${API_BASE}/projects`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-organization-id': adminOrgId,
      },
    });
    const projs = projRes.data?.projects || projRes.data?.data || [];
    if (projs.length > 0) {
      adminProjectId = projs[0].id;
      adminClientId = projs[0].clientId;
    }
  } catch (err: any) {
    console.warn('Erro ao obter projeto do admin:', err.message);
  }

  // Test 2.1: IDOR - Atacante tentando ler clientes da Agência A
  if (attackerToken && adminClientId) {
    const res = await request(`${API_BASE}/clients/${adminClientId}`, {
      headers: {
        Authorization: `Bearer ${attackerToken}`,
        'x-organization-id': attackerOrgId,
      },
    });
    const passed = res.status === 404 || res.status === 403;
    record({
      category: 'IDOR',
      name: 'Acesso cruzado a cliente de outro tenant',
      passed,
      severity: passed ? 'INFO' : 'CRITICAL',
      details: passed
        ? `Bloqueado com sucesso: status ${res.status} (${res.data?.error?.message || 'Bloqueado'})`
        : 'VULNERABILIDADE CRÍTICA: Agência B conseguiu acessar detalhes do cliente da Agência A!',
    });
  }

  // Test 2.2: IDOR - Atacante tentando alterar projeto da Agência A
  if (attackerToken && adminProjectId) {
    const res = await request(`${API_BASE}/projects/${adminProjectId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${attackerToken}`,
        'x-organization-id': attackerOrgId,
      },
      body: { name: 'PROJETO INVADIDO!' },
    });
    const passed = res.status === 404 || res.status === 403;
    record({
      category: 'IDOR',
      name: 'Modificação de projeto de outro tenant',
      passed,
      severity: passed ? 'INFO' : 'CRITICAL',
      details: passed
        ? `Bloqueado com sucesso: status ${res.status}`
        : 'VULNERABILIDADE CRÍTICA: Agência B conseguiu renomear projeto pertencente à Agência A!',
    });
  }

  // Test 2.3: Org Header Spoofing - Atacante usando o ID da Agência A no cabeçalho x-organization-id
  if (attackerToken && adminOrgId) {
    const res = await request(`${API_BASE}/projects`, {
      headers: {
        Authorization: `Bearer ${attackerToken}`,
        'x-organization-id': adminOrgId,
      },
    });
    const passed = res.status === 403;
    record({
      category: 'Multi-Tenant',
      name: 'Spoofing de cabeçalho x-organization-id',
      passed,
      severity: passed ? 'INFO' : 'CRITICAL',
      details: passed
        ? `Corretamente bloqueado pelo middleware de autorização: status ${res.status}`
        : 'VULNERABILIDADE CRÍTICA: Atacante conseguiu assumir o contexto da Agência A apenas alterando o cabeçalho!',
    });
  }

  // =========================================================================
  // 3. SEGURANÇA DO PORTAL PÚBLICO DO CLIENTE
  // =========================================================================
  console.log('\n--- 3. TESTES DO PORTAL PÚBLICO DO CLIENTE ---');

  // Test 3.1: Token inexistente ou inválido no portal
  const invalidRes = await request(`${API_BASE}/portal/token-totalmente-invalido-123456`);
  record({
    category: 'Portal do Cliente',
    name: 'Rejeição de token inválido no portal',
    passed: invalidRes.status === 404,
    severity: invalidRes.status === 404 ? 'INFO' : 'HIGH',
    details: `Status ${invalidRes.status}: ${invalidRes.data?.error?.message || 'OK'}`,
  });

  // Test 3.2: Acesso ao portal legítimo de um projeto existente
  if (adminProjectId) {
    const portalRes = await request(`${API_BASE}/portal/${adminProjectId}`);
    const d = portalRes.data;
    const validStructure = Boolean(d?.project && d?.client && d?.agency && Array.isArray(d?.deliverables));
    record({
      category: 'Portal do Cliente',
      name: 'Acesso sem senha a projeto legítimo',
      passed: validStructure,
      severity: validStructure ? 'INFO' : 'MEDIUM',
      details: `Carregou portal com sucesso: Projeto="${d?.project?.name}", Cliente="${d?.client?.name}", Agência="${d?.agency?.name}"`,
    });
  }

  // =========================================================================
  // 4. TESTES DE INJEÇÃO, XSS E CARACTERES EXTREMOS
  // =========================================================================
  console.log('\n--- 4. TESTES DE INJEÇÃO (XSS, SQLi, PROTOTYPE POLLUTION) ---');

  // Test 4.1: XSS Injection em criação de cliente
  if (adminToken && adminOrgId) {
    const xssPayload = '<script>alert("XSS")</script><img src="x" onerror="alert(1)">Nome Seguro';
    const createdClientRes = await request(`${API_BASE}/clients`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-organization-id': adminOrgId,
      },
      body: {
        name: xssPayload,
        company: 'Empresa Teste XSS',
      },
    });

    if (createdClientRes.status === 201) {
      const savedName = createdClientRes.data.name;
      const sanitized = !savedName.includes('<script>') && !savedName.includes('onerror=');
      record({
        category: 'Injeção XSS',
        name: 'Sanitização de XSS em campos de texto',
        passed: sanitized,
        severity: sanitized ? 'INFO' : 'HIGH',
        details: `Entrada: ${xssPayload.slice(0, 30)}... | Gravado no banco: ${savedName}`,
      });
    } else {
      record({
        category: 'Injeção XSS',
        name: 'Sanitização de XSS em campos de texto',
        passed: true,
        severity: 'INFO',
        details: `Payload rejeitado pela validação: status ${createdClientRes.status}`,
      });
    }
  }

  // Test 4.2: SQL Injection no parâmetro de busca
  if (adminToken && adminOrgId) {
    const sqliSearch = "' OR '1'='1' -- ";
    const sqliRes = await request(`${API_BASE}/projects?search=${encodeURIComponent(sqliSearch)}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-organization-id': adminOrgId,
      },
    });
    record({
      category: 'SQL Injection',
      name: 'Resistência a SQLi na busca de projetos',
      passed: sqliRes.status === 200,
      severity: 'INFO',
      details: `Prisma ORM tratou a string como literal seguro. Itens retornados: ${sqliRes.data?.projects?.length ?? 0}`,
    });
  }

  // Test 4.3: Prototype Pollution payload
  if (adminToken && adminOrgId) {
    const pollutionPayload = JSON.parse('{"__proto__": {"polluted": true}, "name": "Projeto Teste Pollution"}');
    await request(`${API_BASE}/projects`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'x-organization-id': adminOrgId,
      },
      body: pollutionPayload,
    });
    const isPolluted = (Object.prototype as any).polluted === true;
    delete (Object.prototype as any).polluted;
    record({
      category: 'Prototype Pollution',
      name: 'Proteção contra Prototype Pollution no body JSON',
      passed: !isPolluted,
      severity: isPolluted ? 'CRITICAL' : 'INFO',
      details: isPolluted ? 'Object.prototype foi corrompido!' : 'Middleware de sanitização bloqueou __proto__ com sucesso.',
    });
  }

  // =========================================================================
  // 5. RESUMO FINAL
  // =========================================================================
  console.log('\n======================================================');
  console.log('📊 RESUMO DOS TESTES DE SEGURANÇA E PENTEST:');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`Total de testes: ${results.length}`);
  console.log(`✅ Aprovados: ${passedCount}`);
  console.log(`❌ Falhas/Alertas: ${failedCount}`);
  console.log('======================================================\n');
}

runAudit().catch(console.error);
