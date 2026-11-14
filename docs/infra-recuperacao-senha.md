# Infraestrutura: recuperação de senha

Checklist para desenvolvimento e produção **antes** de implementar envio de e-mail (fase 2).

## PostgreSQL

- Tabela `ecommerce.password_reset_tokens` (incluída no [`schema.db`](../schema.db) raiz).
- Bancos legados: aplicar [`back-end-node/src/database/002-password-reset-tokens.sql`](../back-end-node/src/database/002-password-reset-tokens.sql).
- Produção: API com `DB_USER=svc_node_js` (grupo `ecommerce_app_group` — `SELECT`, `INSERT`, `UPDATE` na tabela).

Verificação local:

```powershell
cd back-end-node
node scripts/verify-password-reset-infra.mjs
```

Esperado: `table` = `ecommerce.password_reset_tokens`, `svc_node_js_privilege` = `true`, usuário demo ativo.

## Variáveis de ambiente (Node)

| Arquivo | Uso |
|---------|-----|
| [`.env.example`](../back-end-node/.env.example) | Desenvolvimento |
| [`.env.production.example`](../back-end-node/.env.production.example) | Modelo de produção |

- **`CORS_ORIGIN`**: a **primeira** origem da lista é usada para montar `…/redefinir-senha?token=…`.
- **`NODE_ENV=development`**: `POST /auth/forgot` gera o link no **console** do Node.
- **`NODE_ENV=production`**: `POST /auth/forgot` retorna **503** até a fase de e-mail (comportamento atual do código).

## Desenvolvimento

1. `back-end-node`: `npm run dev` → porta 3000.
2. `front-end-angular`: `npm start` → porta 4200 (proxy em [`proxy.conf.mjs`](../front-end-angular/proxy.conf.mjs)).
3. Fluxo: `/auth/forgot` → copiar link do terminal → `/redefinir-senha?token=…` → nova senha → login.

O proxy encaminha `POST` em `/auth/**` para o Node; `GET` HTML em `/auth/*` continua no Angular.

## Produção: proxy reverso + SPA

O browser usa URLs **relativas** (`/auth/forgot`, `/auth/reset/...`). O host público deve:

| Caminho | Destino |
|---------|---------|
| `/auth/**`, `/catalog/**`, `/cart/**` | Processo Node (ex.: `http://127.0.0.1:3000`) |
| Demais rotas, incluindo **`/redefinir-senha`** (GET) | Build do Angular + **fallback** `index.html` |

Sem fallback SPA, links `https://site/redefinir-senha?token=…` retornam 404 no servidor web.

Exemplo versionado: [`deploy/nginx/ecommerce.conf`](../deploy/nginx/ecommerce.conf).

Node em produção: `npm run build` + `npm start` (ou systemd/PM2), `CORS_ORIGIN` com a URL HTTPS do site, TLS no proxy.

## Validação em produção (infra atual)

- `POST /auth/reset/:token` — deve funcionar com token válido.
- `POST /auth/forgot` — **503** até implementar SMTP (esperado).

Teste local simulando produção (outro terminal, porta alternativa se 3000 estiver em uso):

```powershell
cd back-end-node
$env:NODE_ENV='production'
$env:PORT='3001'
npm run build
node dist/server.js
```

Em outro shell:

```powershell
# Esperado: 503
Invoke-RestMethod -Method POST -Uri 'http://localhost:3001/auth/forgot' -ContentType 'application/json' -Body '{"email":"cliente.demo@exemplo.com"}' -SkipHttpErrorCheck
```

Gerar token em `NODE_ENV=development`, depois testar reset contra a instância em `production` na porta 3001.

## Próxima fase

Envio de e-mail (nodemailer, variáveis SMTP em `env.ts`, remover 503 quando SMTP estiver configurado).
