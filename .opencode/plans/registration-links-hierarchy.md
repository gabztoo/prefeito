# Plano: Links de Cadastro Hierárquicos + Cards de Usuários

## Objetivo
1. Admin gera link público → Coordenador preenche dados e cria conta
2. Coordenador gera link público → Líder preenche dados e cria conta
3. Cards nas abas mostram hierarquia (coordenador → líderes → eleitores)

## Banco de Dados

### Nova tabela: `registration_token`
```sql
CREATE TABLE "registration_token" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "token" varchar(64) NOT NULL UNIQUE,
  "role" varchar(20) NOT NULL,          -- "coordinator" ou "leader"
  "invitedBy" text NOT NULL REFERENCES "user"("id"),
  "coordinatorId" text REFERENCES "user"("id"),  -- para líderes
  "active" boolean NOT NULL DEFAULT true,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);
```

## Rotas Públicas Novas

### `/cadastro/coordenador/[token]`
- Formulário: nome, CPF, RG, endereço, zona, seção, título de eleitor, email, senha
- Valida token, cria user(role=coordinator) + account

### `/cadastro/lider/[token]`
- Formulário: nome, CPF, endereço, zona, seção, título de eleitor, local de atuação, email, senha
- Valida token, cria user(role=leader, coordinatorId=token.coordinatorId) + account

## Fluxo

1. Admin em `/dashboard/coordenadores` clica "Gerar Link"
2. Cria `registration_token` com role="coordinator", invitedBy=admin.id
3. Admin copia link `/cadastro/coordenador/[token]` e envia
4. Coordenador acessa, preenche dados, escolhe senha → conta criada

1. Coordenador em `/dashboard/lideres` clica "Gerar Link"
2. Cria `registration_token` com role="leader", invitedBy=coord.id, coordinatorId=coord.id
3. Coordenador copia link `/cadastro/lider/[token]` e envia
4. Líder acessa, preenche dados, escolhe senha → conta criada com coordinatorId

## Cards nas Abas

### Coordenadores (accordion expandível)
- Card do coordenador: nome, email, CPF, zona, seção, telefone
- Ao expandir: lista de líderes vinculados
  - Cada líder: nome, CPF, zona, seção, telefone + contagem de eleitores

### Líderes (accordion expandível)
- Card do líder: nome, email, CPF, zona, seção, telefone
- Ao expandir: lista de eleitores vinculados
  - Cada eleitor: nome, CPF, zona, seção, telefone

## Arquivos

### Novos
- `db/migrations/0006_add_registration_token.sql`
- `lib/services/registration.ts`
- `app/cadastro/coordenador/[token]/page.tsx`
- `app/cadastro/coordenador/[token]/actions.ts`
- `app/cadastro/coordenador/[token]/registration-form.tsx`
- `app/cadastro/lider/[token]/page.tsx`
- `app/cadastro/lider/[token]/actions.ts`
- `app/cadastro/lider/[token]/registration-form.tsx`
- `app/dashboard/coordenadores/generate-link-dialog.tsx`
- `app/dashboard/lideres/generate-link-dialog.tsx`

### Modificados
- `db/schema.ts` — adicionar tabela registration_token
- `lib/services/invitation.ts` — adicionar funções de token
- `lib/auth-route-policy.ts` — permitir /cadastro/*
- `app/dashboard/coordenadores/page.tsx` — cards com accordion
- `app/dashboard/coordenadores/actions.ts` — action gerar link
- `app/dashboard/lideres/page.tsx` — cards com accordion
- `app/dashboard/lideres/actions.ts` — action gerar link
