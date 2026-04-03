# API

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
