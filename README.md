# Meu ZapPedido

SaaS para pequenos negócios de alimentação criarem um cardápio digital e receberem pedidos pelo WhatsApp.

## Funcionalidades

- Landing page em português do Brasil.
- Cadastro, login, logout e painel do profissional.
- Configuração da loja com slug público único.
- Cadastro, edição, exclusão e disponibilidade de produtos.
- Cardápio público em `/cardapio/[slug]`.
- Carrinho, checkout e mensagem do WhatsApp formatada.
- Cópia do pedido salva no histórico local do painel.
- Estados vazios, validações, mensagens amigáveis e layout responsivo.

## Desenvolvimento

```bash
npm install
npm run dev
```

## Verificação

```bash
npm run lint
npm run build
```

## Persistência

Esta versão usa um repositório local baseado em `localStorage` para manter o fluxo completo funcionando sem depender de serviços externos. A camada de dados está centralizada em `src/App.tsx` e pode ser substituída por Supabase, Firebase, PostgreSQL ou API própria mantendo os mesmos modelos principais: usuários, lojas, produtos e pedidos.
