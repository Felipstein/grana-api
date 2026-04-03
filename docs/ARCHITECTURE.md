# Arquitetura — Grana Backend

## Visão Geral

O backend do Grana segue os princípios de Clean Architecture com elementos de DDD,
organizado em camadas bem definidas com baixo acoplamento entre elas.
A infraestrutura é 100% AWS serverless, com suporte a execução local via LocalStack.

---

## Stack de Tecnologias

| Camada | Tecnologia |
|---|---|
| Runtime | Node.js + TypeScript |
| Funções | AWS Lambda |
| API | AWS API Gateway |
| Autenticação | AWS Cognito |
| Banco de dados | AWS DynamoDB (Single Table Design) |
| Infra como código | Serverless Framework |
| Ambiente local | LocalStack |

---

## Camadas da Aplicação

### Domain
Núcleo da aplicação. Não tem dependência de nenhuma camada externa.

- **Entities** — objetos de domínio com identidade e regras de negócio intrínsecas
  (ex: `Transaction`, `Reserve`, `Category`, `User`)
- **Value Objects** — objetos imutáveis sem identidade própria
  (ex: `Money`, `RecurrenceRule`, `DateRange`)
- **Domain Events** — eventos que representam algo que aconteceu no domínio
  (ex: `TransactionCreated`, `ReserveDeposited`)
- **Repository Interfaces** — contratos que definem como persistir e recuperar entidades,
  sem saber como isso é implementado

### Application
Orquestra os casos de uso. Depende apenas do domínio.

- **Commands** — operações que alteram estado (ex: `CreateTransactionCommand`,
  `DepositToReserveCommand`)
- **Queries** — operações de leitura sem efeito colateral (ex: `GetMonthSummaryQuery`,
  `ListTransactionsQuery`)
- **Handlers** — implementam os commands e queries, coordenando entidades e repositórios
- **DTOs** — objetos de transferência de dados entre camadas

O padrão CQRS é aplicado nessa camada: commands e queries são tratados separadamente,
com handlers distintos.

### Infrastructure
Implementações concretas das interfaces definidas no domínio.

- **Repositories** — implementações dos contratos usando DynamoDB
- **DynamoDB** — cliente, mappers e helpers do Single Table Design
- **Cognito** — integração com o serviço de autenticação

### Interface
Ponto de entrada da aplicação. Agnóstico do transporte.

- **Controllers** — recebem uma requisição normalizada, chamam o handler correspondente
  e retornam uma resposta normalizada. Não sabem se estão rodando em Lambda ou Express.
- **Presenters** — formatam a saída dos handlers para o formato esperado pelo cliente

### Transport
Adaptadores que conectam o controller ao mundo externo.

- **Lambda Adapter** — converte o evento da Lambda para o formato que o controller entende,
  e converte a resposta do controller para o formato que o API Gateway espera
- **Express Adapter** *(futuro)* — faz o mesmo para um servidor HTTP convencional,
  permitindo migração sem tocar nos controllers
```
Requisição HTTP
      ↓
API Gateway
      ↓
Lambda Handler (Transport)
      ↓
Controller (Interface) ← agnóstico do transporte
      ↓
Command/Query Handler (Application)
      ↓
Domain Entities + Repository Interface
      ↓
DynamoDB Repository (Infrastructure)
      ↓
DynamoDB (AWS / LocalStack)
```

---

## Autenticação

O Cognito é responsável por autenticação e gerenciamento de sessão.

- Cadastro e login são feitos diretamente pelo cliente com o Cognito User Pool
- O cliente recebe um JWT após autenticação
- Todas as rotas protegidas passam por um **Lambda Authorizer** no API Gateway,
  que valida o JWT antes de a requisição chegar à função de negócio
- O `userId` extraído do token é repassado para os controllers via contexto da requisição

---

## Banco de Dados

DynamoDB com **Single Table Design** — todas as entidades em uma única tabela.

A modelagem detalhada com access patterns, partition keys, sort keys e índices
secundários está documentada em `docs/DYNAMODB.md`.

---

## Ambiente Local

Para desenvolvimento local, o LocalStack simula os serviços da AWS:

| Serviço AWS | Simulado por |
|---|---|
| Lambda | LocalStack |
| API Gateway | LocalStack |
| DynamoDB | LocalStack |
| Cognito | LocalStack (ou mock customizado) |

O Serverless Framework é configurado para apontar para o LocalStack quando
a variável de ambiente `IS_LOCAL=true` estiver definida.

---

## Princípios Guia

- **Controllers agnósticos de transporte** — nenhum controller importa tipos do Lambda
  ou do Express. A troca de transporte não exige mudança de código de negócio.
- **Domínio sem dependências externas** — nenhuma entidade ou regra de domínio importa
  AWS SDK, DynamoDB ou qualquer lib de infraestrutura.
- **Repositórios por interface** — a camada de application só conhece a interface.
  A implementação concreta é injetada via dependency injection.
- **CQRS explícito** — leituras e escritas têm handlers separados, facilitando
  otimizações futuras (ex: cache em queries sem afetar commands).
