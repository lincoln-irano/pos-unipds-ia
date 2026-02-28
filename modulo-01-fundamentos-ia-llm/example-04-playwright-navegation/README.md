# Playwright: Preencher formulário com dados do Sessionize

Este script abre a página do palestrante em Sessionize, tenta selecionar conteúdo em Português, procura uma sessão com "javascript" no título (em português) e preenche o formulário do Google (sem submeter). Gera um snapshot `filled_form_snapshot.png`.

Requisitos:
- Node.js 16+

Passos rápidos:

```bash
cd modulo-01-fundamentos-ia-llm/example-04-playwright-navegation
npm init -y
npm install -D playwright
npx playwright install
node fill_form.js
```

Notas:
- O script tenta heurísticas para detectar perguntas e campos do formulário; Google Forms carrega muitos elementos via JS, então pode não preencher 100% dos campos em todas as versões do formulário.
- O script NÃO clica no botão de submit; apenas preenche e salva um screenshot.
