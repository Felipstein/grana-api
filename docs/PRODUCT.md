# Grana — Documentação de Produto

## Domínio e Terminologia

| Termo | Definição |
|---|---|
| **Lançamento** | Registro de uma movimentação financeira do usuário |
| **Entrada** | Lançamento com valor positivo |
| **Despesa** | Lançamento com valor negativo |
| **Categoria** | Classificação de um lançamento, definida pelo usuário |
| **Recorrência** | Propriedade de um lançamento que define se ele se repete automaticamente |
| **Compromisso** | Lançamento programado para ocorrer em mês futuro |
| **Reserva** | Fundo financeiro separado alocado para uma finalidade específica |
| **Instituição** | Onde a reserva está custodiada (ex: Nubank, XP Investimentos) |
| **Ciclo mensal** | Período de referência para agrupamento de lançamentos, definido pelo usuário |

---

## Módulos Funcionais

### 1. Autenticação

- Usuário pode se cadastrar com nome, e-mail e senha
- Usuário pode fazer login com e-mail e senha
- Usuário pode alterar o próprio nome
- Usuário pode alterar a própria senha (requer senha atual)
- Recuperação de senha não está no escopo atual

---

### 2. Lançamentos

Um lançamento pertence a um usuário, tem um tipo (entrada ou despesa), valor, data, descrição, categoria e opcionalmente observações e recorrência.

**Criar lançamento**
- Campos obrigatórios: tipo, valor, descrição, data, categoria
- Campo opcional: observações
- Campo opcional: configuração de recorrência

**Editar lançamento**
- Todos os campos são editáveis
- Se o lançamento fizer parte de uma série recorrente, a edição afeta apenas aquela ocorrência

**Excluir lançamento**
- Exclusão simples: remove apenas aquela ocorrência
- Exclusão em cascata: remove aquela ocorrência e todas as futuras da mesma série recorrente

**Listar lançamentos**
- Filtrado por mês/ano
- Filtrado por tipo (todos, entradas, despesas)
- Buscável por descrição

**Resumo mensal**
- Saldo do mês = total de entradas − total de despesas
- Total de entradas do mês
- Total de despesas do mês

---

### 3. Recorrência

Um lançamento pode ter um de três tipos de recorrência:

| Tipo | Comportamento |
|---|---|
| `once` | Não se repete. Ocorrência única. |
| `recurring` | Repete todo mês indefinidamente na mesma data e valor |
| `installment` | Repete por N meses na mesma data e valor, com contador decrescente |

**Regras:**
- Lançamentos recorrentes e parcelados geram automaticamente suas ocorrências futuras a cada virada de mês
- Lançamentos parcelados têm um contador de parcelas restantes que decrementa a cada mês. Quando chega a zero, a série é encerrada
- Uma série recorrente é identificada por um ID de grupo que liga todas as ocorrências entre si
- Editar ou excluir uma ocorrência individualmente não afeta as demais, a menos que a operação em cascata seja explicitamente solicitada

---

### 4. Categorias

- Cada usuário tem suas próprias categorias
- Categoria tem nome e cor
- O usuário pode criar, editar e excluir categorias
- Categorias são usadas para classificar lançamentos e futuramente para relatórios

---

### 5. Compromissos

Compromissos são a visão dos lançamentos programados para um mês futuro. Não são uma entidade separada — são derivados dos lançamentos com recorrência projetados para aquele mês.

Agrupados em três tipos:
- **Recorrentes** — originados de lançamentos com tipo `recurring`
- **Parcelas** — originados de lançamentos com tipo `installment`, exibindo progresso (parcela atual / total)
- **Agendados** — lançamentos com tipo `once` cuja data está no mês consultado

**Resumo de compromissos:**
- Total de entradas previstas para o mês consultado
- Total de saídas previstas para o mês consultado
- Saldo líquido previsto

---

### 6. Reservas

Reservas são fundos financeiros separados do fluxo de caixa principal. O saldo de uma reserva **não** entra no cálculo de entradas/saídas/saldo mensal.

- Cada reserva tem nome e instituição
- Cada reserva tem um saldo atual
- O usuário pode criar e excluir reservas

**Depositar em reserva**
- Registra um aporte na reserva, incrementando o saldo
- Gera automaticamente um lançamento de **despesa** na data informada, para que o dinheiro saía do fluxo de caixa e "entre" na reserva
- Observação do depósito vira descrição do lançamento gerado (se preenchida)

**Retirar de reserva**
- Registra uma retirada na reserva, decrementando o saldo
- Gera automaticamente um lançamento de **entrada** na data informada, para que o dinheiro "saia" da reserva e volte ao fluxo de caixa
- Observação da retirada vira descrição do lançamento gerado (se preenchida)

**Histórico de movimentações**
- Cada reserva mantém um histórico de depósitos e retiradas com data, valor e observação

**Resumo de reservas**
- Total reservado = soma dos saldos de todas as reservas do usuário

---

### 7. Configurações do Usuário

- **Moeda** — padrão BRL
- **Início do ciclo mensal** — dia do mês em que o ciclo começa (padrão: dia 1)
- **Formato de data** — padrão DD/MM/YYYY

---

## Regras de Negócio Consolidadas

1. Todo dado pertence a um usuário — nenhum dado é compartilhado entre usuários
2. Saldo do mês não inclui saldo de reservas
3. Depósito em reserva gera despesa no fluxo de caixa
4. Retirada de reserva gera entrada no fluxo de caixa
5. Lançamentos recorrentes e parcelados se propagam automaticamente a cada virada de ciclo
6. Excluir uma ocorrência de série não afeta as demais por padrão
7. Excluir em cascata remove a ocorrência atual e todas as futuras da mesma série
8. Não é possível consultar dados de meses futuros no dashboard — apenas mês atual e passados
9. Categorias são por usuário — dois usuários podem ter categorias com o mesmo nome sem conflito
