# grana · API

## Fluxo de desenvolvimento

Todo código que vai para produção passa obrigatoriamente por um Pull Request. Commits diretos na `main` são bloqueados pelo branch protection do GitHub.

```
feature/minha-feature
        │
        │  git push + abrir PR
        ▼
   Pull Request ──► CI roda automaticamente
        │            ├─ Lint (ESLint)
        │            ├─ Type check (tsc)
        │            └─ Testes (Vitest)
        │
        │  CI passou + 1 aprovação de reviewer
        ▼
     merge na main
        │
        ▼
   Deploy automático ──► AWS (stage: prod)
```

---

## Regras da branch `main`

- Commits diretos são bloqueados — toda alteração entra via PR
- O PR só pode ser mergeado se:
  - O CI passar (lint, types e testes sem erros)
  - Pelo menos 1 desenvolvedor aprovar o PR
- Se novos commits forem adicionados ao PR após a aprovação, a aprovação é invalidada e precisa ser refeita

---

## CI (Pull Request)

**Arquivo:** `.github/workflows/ci.yml`

Roda a cada push em qualquer PR aberto contra a `main`. Qualquer falha bloqueia o merge:

| Passo | Comando | O que verifica |
|---|---|---|
| Lint | `pnpm lint` | Erros de estilo e padrões ESLint |
| Type check | `pnpm typecheck` | Erros de tipagem TypeScript sem compilar |
| Tests | `pnpm test` | Todos os testes unitários com Vitest |

---

## Deploy automático para produção

**Arquivo:** `.github/workflows/deploy-prod.yml`

Dispara automaticamente quando um PR é mergeado na `main`.

Passos:
1. Instala as dependências
2. Autentica na AWS via **OIDC** (sem chaves de acesso — credenciais temporárias geradas pelo GitHub)
3. Executa `serverless deploy --stage prod`

### Autenticação AWS (OIDC)

O deploy não usa `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`. O GitHub gera um token temporário que a AWS troca por credenciais de curta duração via a role configurada. Nenhum segredo de longa duração fica armazenado em lugar nenhum.

**Secrets necessários no repositório** (Settings → Secrets and variables → Actions):

| Secret | Valor |
|---|---|
| `AWS_ROLE_ARN` | ARN da IAM Role criada para o deploy |
| `AWS_REGION` | `sa-east-1` |

**Setup único na AWS:**

1. IAM → Identity Providers → Add provider
   - Type: OpenID Connect
   - URL: `https://token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
2. Criar uma IAM Role com trust policy:
   ```json
   {
     "Effect": "Allow",
     "Principal": {
       "Federated": "arn:aws:iam::SEU_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
     },
     "Action": "sts:AssumeRoleWithWebIdentity",
     "Condition": {
       "StringLike": {
         "token.actions.githubusercontent.com:sub": "repo:SEU_ORG/SEU_REPO:*"
       }
     }
   }
   ```
3. Anexar à role as permissões necessárias: CloudFormation, Lambda, DynamoDB, Cognito, S3, IAM, API Gateway
4. Copiar o ARN da role e salvar no secret `AWS_ROLE_ARN`

---

## Proteção de recursos em produção

O `serverless.yml` aplica proteção contra deleção acidental condicionada ao stage:

| Recurso | dev | prod |
|---|---|---|
| DynamoDB Table | sem proteção | `DeletionProtectionEnabled: true` |
| Cognito User Pool | `INACTIVE` | `DeletionProtection: ACTIVE` |

Para remover esses recursos em prod é necessário desativar a proteção manualmente no console AWS antes de qualquer operação destrutiva.

---

## Rodando localmente

### Pré-requisitos

- Node.js
- pnpm
- Docker

### 1. Suba os serviços locais
```bash
docker compose up -d
```

Isso sobe o MiniStack (emulador AWS local) e o DynamoDB Admin UI em `http://localhost:8001`.

### 2. Configure os serviços AWS locais

Na primeira vez, rode o setup para provisionar os serviços locais AWS necessários:
```bash
pnpm setup:local
```

> Nas próximas vezes não é necessário — o estado é persistido entre restarts.

### 3. Suba a aplicação
```bash
pnpm dev
```

A API estará disponível em `http://localhost:3000`.
