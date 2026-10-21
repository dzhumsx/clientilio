# 🛡️ Plano de Recuperação de Desastres (Disaster Recovery & Business Continuity)

## 1. Visão Geral e Objetivos

Este documento formaliza as diretrizes, procedimentos e métricas de contingência do sistema **Nexora** em caso de indisponibilidade severa de infraestrutura, perda de banco de dados, corrupção de dados ou incidentes de segurança.

| Métrica | Meta Operacional | Descrição |
|---|---|---|
| **RPO (Recovery Point Objective)** | **<= 1 Hora** | Perda máxima aceitável de dados em caso de sinistro. |
| **RTO (Recovery Time Objective)** | **< 15 Minutos** | Tempo máximo tolerado para restabelecer os serviços essenciais. |

---

## 2. Estratégia de Backups

1. **Periodicidade**:
   - Backups automatizados gerados diariamente e antes de qualquer migração de banco de dados.
   - Retenção local e remota mantendo histórico de no mínimo **7 snapshots** (`backups/*.json.gz`).
2. **Integridade Criptográfica**:
   - Cada arquivo de backup possui arquivo descritor de metadados (`*.meta.json`) contendo hash **SHA-256**, contagem de linhas e carimbo de tempo ISO 8601.
3. **Execução Manual de Backup**:
   ```bash
   npm --prefix server run backup:create
   ```

---

## 3. Procedimento de Restauração em Caso de Desastre

### Cenário A: Falha ou Corrupção do Banco de Dados PostgreSQL
1. **Identificar o snapshot válido mais recente**:
   Verifique o diretório `backups/` e localize o último arquivo `.json.gz` e seu `.meta.json`.
2. **Validar o hash SHA-256**:
   Confirme que o arquivo não sofreu corrupção em trânsito ou repouso.
3. **Executar a restauração**:
   ```bash
   npm --prefix server run backup:restore
   ```
4. **Verificar a integridade pós-restauração**:
   Acesse a rota de monitoramento de saúde:
   ```bash
   curl http://localhost:3000/api/monitoring/health
   ```

### Cenário B: Queda Total de Nós ou Servidores de Aplicação
1. O balanceador de carga NGINX isola réplicas com falha automaticamente (`proxy_next_upstream`).
2. Reinicie os contêineres ou suba novas réplicas via Docker Compose:
   ```bash
   docker compose up -d --scale server=2
   ```

---

## 4. Testes Periódicos de Simulação (DR Drills)

A equipe deve rodar simulações regulares para garantir que o processo continua funcionando:
```bash
npm --prefix server run dr:drill
```
Este comando executa um ciclo completo de teste (geração de snapshot, verificação de hash, teste de latência e cálculo do RTO alcançado).
