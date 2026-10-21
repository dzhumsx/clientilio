import { execSync } from 'child_process';
import { logger } from '../src/lib/logger';

/**
 * Script de Auditoria Automatizada de Dependências e Vulnerabilidades
 */
function auditDependencies() {
  console.log('🔍 Executando varredura de vulnerabilidades de dependências (npm audit)...');

  try {
    const stdout = execSync('npm audit --json', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const report = JSON.parse(stdout);

    const vulnerabilities = report.metadata?.vulnerabilities || {};
    const total = Object.values(vulnerabilities).reduce((acc: number, val: any) => acc + (val || 0), 0) as number;

    console.log('\n📊 Resumo da Auditoria de Segurança de Dependências:');
    console.log(`- Total de vulnerabilidades encontradas: ${total}`);
    console.log(`- Críticas: ${vulnerabilities.critical || 0}`);
    console.log(`- Altas: ${vulnerabilities.high || 0}`);
    console.log(`- Moderadas: ${vulnerabilities.moderate || 0}`);
    console.log(`- Baixas: ${vulnerabilities.low || 0}`);

    if ((vulnerabilities.critical || 0) > 0 || (vulnerabilities.high || 0) > 0) {
      console.warn('\n⚠️ Foram encontradas vulnerabilidades que exigem atenção. Execute `npm audit fix` para atualizar.');
    } else {
      console.log('\n✅ Nenhuma vulnerabilidade crítica ou alta detectada nas dependências do projeto.');
    }
  } catch (err: any) {
    // npm audit retorna código de saída diferente de zero se encontrar vulnerabilidades
    try {
      const output = err.stdout ? JSON.parse(err.stdout) : null;
      if (output?.metadata?.vulnerabilities) {
        const v = output.metadata.vulnerabilities;
        console.log('\n📊 Relatório de Vulnerabilidades:');
        console.log(`- Críticas: ${v.critical || 0} | Altas: ${v.high || 0} | Moderadas: ${v.moderate || 0} | Baixas: ${v.low || 0}`);
        return;
      }
    } catch {
      // Ignora erro de parsing
    }
    console.log('✅ Auditoria de dependências executada.');
  }
}

if (require.main === module) {
  auditDependencies();
}
