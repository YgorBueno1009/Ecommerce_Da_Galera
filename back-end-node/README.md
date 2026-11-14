# Back-end Node.js

API Express em TypeScript para o serviço Node da loja. O cadastro de cliente segue a seção 2.2 do SRS e persiste em `ecommerce.users` do PostgreSQL compartilhado.

## Cadastro de cliente

`POST /auth/register` recebe JSON:

```json
{
  "fullName": "Nome do cliente",
  "email": "cliente@exemplo.com",
  "password": "senha-com-pelo-menos-8",
  "confirmPassword": "senha-com-pelo-menos-8",
  "documentNumber": "12345678900",
  "phone": "+5511999999999"
}
```

`phone` pode ser omitido. CPF/CNPJ pode ser enviado com pontuação e é persistido somente com dígitos. O serviço valida os campos, calcula o hash BCrypt e insere explicitamente o papel `CLIENTE`; não aceita campos adicionais como `role`. O e-mail e o documento são protegidos também pelas constraints do banco.

Em caso de sucesso, responde `201` com `{ "user": { ... }, "token": "..." }`. O JWT inclui `sub` com o UUID do cliente, `role: "CLIENTE"` e `context: "STORE"`. Dados inválidos retornam `400`, e conflito de e-mail/documento retorna `409`.

## Login

`POST /auth/login` recebe JSON com `email` e `password`. O e-mail é normalizado, e a senha é comparada com o hash BCrypt armazenado. Em caso de sucesso, responde `200` com usuário, JWT e `redirectTo`: clientes recebem `role: "CLIENTE"` e `context: "STORE"` e seguem para `/catalog/home`; administradores recebem um token sem claim `context` e seguem para `/auth/context`. Credenciais incorretas ou conta inativa retornam a mesma resposta `401` (`E-mail ou senha inválidos`), e o endpoint limita tentativas por IP.

`POST /auth/context` exige `Authorization: Bearer <token>` de um administrador ativo e recebe `{ "context": "STORE" }` ou `{ "context": "ADMIN" }`. A resposta reemite um JWT com a claim `context` escolhida e `redirectTo` para `/catalog/home` ou `/admin/dashboard`. Clientes recebem `403`.

Todos os JWTs de sessão incluem `jti`. `POST /auth/logout` recebe o token em `Authorization: Bearer <token>`, grava o `jti` na deny-list e responde com `redirectTo: "/auth/login"`. `/auth/context` recusa sessões revogadas; as demais rotas protegidas e os serviços Java/PHP também devem consultar `ecommerce.revoked_tokens`.

## Catálogo e carrinho

- `GET /catalog/categories` lista as categorias ativas, incluindo o slug da categoria pai quando houver.
- `GET /catalog/products` lista produtos ativos e aceita `q`, `category`, `voltage`, `color`, `size`, `sort` (`relevance`, `price-asc`, `price-desc`), `limit` (1 a 100) e `offset`. A categoria inclui suas subcategorias.
- `GET /catalog/products/:slug` retorna o detalhe de um produto ativo.
- As respostas do catálogo seguem os campos usados pelo Angular (`id`, `slug`, `sku`, `nome`, `preco`, `categoria`, `oferta`, `estoque`, `voltagem`, `cor`, `tamanho` e `fichaTecnica`). Características variáveis vêm de `products.attributes`.
- As rotas `/cart` exigem uma sessão com contexto `STORE`: `GET /cart`, `POST /cart/items` (`{ "productId": "...", "quantity": 1 }`), `PATCH /cart/items/:productId` (`{ "quantity": 2 }`), `DELETE /cart/items/:productId` e `DELETE /cart`.
- O carrinho é persistido por usuário; preços e estoque são lidos do banco, e adicionar/alterar quantidade rejeita valores acima do estoque disponível. O carrinho não reserva estoque: a reserva continua ocorrendo no fluxo de pedidos Java.

## Recuperação de senha

Em desenvolvimento/teste, `POST /auth/forgot` recebe `{ "email": "cliente@exemplo.com" }` e responde `200` com uma mensagem genérica, sem revelar se a conta existe. O link é enviado ao console; o token aleatório não é um JWT, somente seu hash SHA-256 é armazenado e expira em 15 minutos. Em produção, a rota responde `503` até haver um serviço de entrega de e-mail configurado.

Infra (PostgreSQL, `CORS_ORIGIN`, proxy dev e Nginx em produção): [`docs/infra-recuperacao-senha.md`](../docs/infra-recuperacao-senha.md). Verificação do banco: `node scripts/verify-password-reset-infra.mjs`.

`POST /auth/reset/:token` recebe `{ "password": "...", "confirmPassword": "..." }`, valida as mesmas regras de senha do cadastro, atualiza o hash BCrypt e invalida o token na mesma transação. Token inválido, expirado ou já usado retorna `400` com `redirectTo: "/auth/forgot"`; sucesso retorna `200` com `redirectTo: "/auth/login"`.

## Executar

1. Use Node.js 22 ou superior.
2. Copie `.env.example` para `.env` e configure a conexão PostgreSQL, uma `JWT_SECRET` aleatória com pelo menos 32 caracteres e as origens Angular em `CORS_ORIGIN` (separadas por vírgula).
3. Crie o banco aplicando o `schema.db` da raiz. A conta da aplicação deve ter apenas os privilégios necessários para o serviço.
4. Instale e execute:

```powershell
npm install
npm run dev
```

A API verifica a conexão com PostgreSQL ao iniciar e escuta na porta `PORT` (3000 por padrão). Para compilar e executar em produção, use `npm run build` e `npm start`. `npm test` executa os testes de validação do cadastro, login, contexto, logout e recuperação de senha.

Cada chamada HTTP é registrada no console com método, rota, status e duração. Os logs usam o padrão da rota (sem valores de parâmetros) e não incluem query string nem corpo da requisição. Em terminais interativos, 2xx aparece em verde, 3xx em amarelo, 4xx em vermelho e 5xx em vermelho negrito; a variável `NO_COLOR` desativa as cores.

Se o schema já estiver instalado, aplique `src/database/001-redact-password-hash-from-audit.sql`, `src/database/002-password-reset-tokens.sql`, `src/database/003-revoked-tokens.sql` e `src/database/004-shopping-cart.sql`. O trigger registra as alterações dos usuários sem incluir `password_hash` nos novos snapshots; essa alteração não remove hashes que eventualmente já estejam em logs antigos.

Para popular categorias, produtos, estoque e um cliente demo com os mesmos dados do mock do Angular, execute `npm run db:seed` ou aplique `src/database/005-mock-catalog-seed.sql` com o `psql` (idempotente). Credenciais do cliente demo: `cliente.demo@exemplo.com` / `SenhaDemo123!`.

## Limites entre serviços

- O Node é o emissor de JWT; checkout/pedidos pertencem ao Java e o painel administrativo ao PHP/Laravel.
- O Angular consome as APIs Node de autenticação e catálogo. O carrinho tem API persistida no Node; a reserva efetiva do estoque continua no serviço Java ao criar o pedido.
- `schema.db` é compartilhado pelos serviços. Mudanças e permissões de banco precisam ser coordenadas entre as equipes.
