# Testes de falha

Site: https://trabalho-pp-d.pages.dev
Nenhum cookie, state, nonce, código ou URL com valores transitórios foi registrado neste arquivo.

## Caso 1: retorno sem cookie temporário

- **Preparação:** iniciei o login com GitHub em `/oauth/login/github` e parei na tela de autorização do GitHub, sem clicar em Authorize. Em outra aba do mesmo navegador, abri as ferramentas de desenvolvimento (Application > Cookies) no domínio do site e apaguei o cookie `__Host-oauth-tx`.
- **Pedido enviado:** voltei à tela do GitHub e cliquei em Authorize, o que fez o navegador chamar `/oauth/callback/github` sem o cookie temporário.
- **Resultado esperado:** a rota de retorno recusa a resposta e nenhuma sessão é criada.
- **Resultado observado:** o site exibiu "Falha na autenticação". Ao abrir `/api/me`, a resposta foi `{"error":"unauthorized"}`, portanto nenhuma sessão foi criada.

## Caso 2: state alterado

- **Preparação:** iniciei outro login em `/oauth/login/github`, parei na tela do GitHub e, na barra de endereço, alterei uma única letra do valor do parâmetro `state`, sem mexer em mais nada.
- **Pedido enviado:** recarreguei a página com o `state` alterado e cliquei em Authorize.
- **Resultado esperado:** a rota de retorno recusa a resposta antes de trocar o código, sem criar sessão.
- **Resultado observado:** o site exibiu "Falha na autenticação". Ao abrir `/api/me`, a resposta foi `{"error":"unauthorized"}`. A URL modificada não foi registrada.

## Caso 3: reutilização da transação

- **Preparação:** concluí um login com Google com sucesso. `/api/me` devolveu o perfil mínimo (e-mail e nome de exibição). Na aba Network, localizei a requisição de retorno `/oauth/callback/google` desse login e usei Copy URL.
- **Pedido enviado:** abri a URL copiada novamente em uma aba nova.
- **Resultado esperado:** a transação já foi removida no primeiro uso, então a repetição falha.
- **Resultado observado:** o site exibiu "Falha na autenticação" em `/oauth/callback/google`. A URL copiada não foi registrada.

## Caso 4: sessão expirada

- **Preparação:** concluí um login com GitHub com sucesso; a página inicial exibiu a sessão do usuário (o GitHub não expôs e-mail público, então o nome de exibição foi usado).
- **Pedido enviado:** no console do banco D1 do laboratório, executei `UPDATE sessions SET expires_at = 0;` e, em seguida, abri `/api/me`.
- **Resultado esperado:** `/api/me` responde 401, pois a sessão passou a constar como expirada.
- **Resultado observado:** `/api/me` respondeu `{"error":"unauthorized"}` (401). Ao recarregar a página inicial, ela passou a exibir "Nenhuma sessão neste navegador."

## Caso 5: origem inválida na saída

- **Preparação:** com uma sessão válida aberta em `https://trabalho-pp-d.pages.dev` (login com Google concluído e `/api/me` devolvendo o perfil), abri o console do navegador em uma página de origem diferente da do site (`chrome://startpage`).
- **Pedido enviado:** executei no console `fetch("https://trabalho-pp-d.pages.dev/oauth/logout", { method: "POST", credentials: "include" })`, duas vezes.
- **Resultado esperado:** a rota recusa a operação e a sessão original permanece válida.
- **Resultado observado:** as duas requisições `logout` retornaram **403 (Forbidden)** na aba Network, e o console registrou a falha do `fetch`. Ao voltar à aba do site e abrir `/api/me`, a resposta continuou devolvendo o perfil mínimo (e-mail e nome de exibição), portanto a sessão permaneceu válida.

## Caso 6: reutilização do cookie revogado

- **Preparação:** com uma sessão exclusiva do laboratório ativa, copiei temporariamente o valor do cookie `__Host-session` pelas ferramentas de desenvolvimento (Application > Cookies). O valor não foi registrado neste arquivo. Em seguida executei o logout pelo botão "Sair".
- **Pedido enviado:** recriei manualmente o cookie `__Host-session` com o mesmo valor (Path `/`, Secure, HttpOnly) e recarreguei a página, o que fez o navegador chamar `/api/me` com esse cookie.
- **Resultado esperado:** `/api/me` responde 401, pois a linha da sessão foi removida do D1 no logout.
- **Resultado observado:** `/api/me` respondeu **401 (Unauthorized)** mesmo com o cookie presente no navegador, e a página exibiu "Nenhuma sessão neste navegador." Depois do teste, apaguei o cookie recriado e a cópia do valor.
