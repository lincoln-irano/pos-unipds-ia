# Better Auth + Next.js (App Router) — Demo

Projeto demo mínimo usando Next.js (App Router) + TypeScript + Tailwind CSS + Better Auth com SQLite (better-sqlite3).

Passos rápidos:

1. Copie as variáveis de ambiente:

```
cp .env.example .env.local
# editar .env.local e preencher GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET
```

2. Instalar dependências:

```
npm install
```

3. Gerar tabelas do Better Auth (usa arquivo local better-auth.sqlite):

```
npm run migrate
```

4. Rodar em dev:

```
npm run dev
```

Visite `http://localhost:3000`.

Observações:
- O projeto usa `new Database("./better-auth.sqlite")` para persistência local.
- O comando de migração utiliza `npx @better-auth/cli migrate` como solicitado.
