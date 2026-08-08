# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos

```bash
npm run dev                      # Vite dev server (http://localhost:5173)
npm run build                    # vue-tsc + vite build → dist/
npm run lint                     # eslint . (android/, ios/, dist/ ignorados)
npx vue-tsc --noEmit             # typecheck isolado, sem gerar build

npm run test:unit                # vitest em modo WATCH — trava o terminal
npx vitest run                   # execução única (use este em automação)
npx vitest run tests/unit/runway.spec.ts        # um arquivo
npx vitest run -t "calcularFolego"              # por nome de teste
```

Android (requer Java 17 + Android SDK):

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleRelease
```

## Release

`npm version <patch|minor|major>` gera o commit com o número da versão e a tag `v<versão>`.
O push da tag dispara `.github/workflows/build-release.yml`, que compila o APK assinado e
publica um GitHub Release. Assinatura vem de secrets (`KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`,
`KEY_ALIAS`, `KEY_PASSWORD`).

O `package.json` é a fonte única da versão: `android/app/build.gradle` deriva dela tanto o
`versionName` quanto o `versionCode` (`major*10000 + minor*100 + patch`), e o Vite injeta
`__APP_VERSION__` para a tela de Configurações. Nunca escreva a versão à mão em outro lugar.

Há dois workflows, com gatilhos distintos:

| Workflow | Dispara em | Faz |
|---|---|---|
| `ci.yml` | push em `main` | `npm run lint`, `npx vitest run`, `npm run build` |
| `build-release.yml` | tags `v*` | compila o APK assinado e publica o Release |

O build de release **não** roda lint nem testes — quem cobre isso é o `ci.yml` em `main`.
Ao taguear a partir de um commit já verde em `main`, o código já passou pela verificação.

## Arquitetura

App Vue 3 + Ionic empacotado com Capacitor. Sem banco: tudo em `localStorage`.

O propósito define o modelo de dados: o usuário lança **um total de entradas e um total de
saídas por mês**, sem categorias. `RegistroMensal` é a única entidade de fato, com
`{mes, ano, ganhos, gastos}` — não existem transações individuais. Qualquer feature que
pressuponha lançamentos avulsos ou categorias exige um modelo novo e uma migração.

### Três camadas

1. **`src/services/storageService.ts`** — I/O do `localStorage`, migrações, backup/restore.
   Sem cálculo.
2. **`src/domain/*.ts`** — funções **puras** (fôlego, objetivos, lacunas). É onde lógica nova
   deve entrar: são testáveis diretamente, sem tocar no singleton do composable.
3. **`src/composables/usePatrimonio.ts`** — o cérebro reativo. Um **singleton em escopo de
   módulo** (`registros`, `config`, `objetivos`, `filtroAtivo` vivem fora da função) para que
   todas as páginas e o `FiltroPeriodoPanel` compartilhem o mesmo estado.

O singleton tem duas consequências práticas:

- Ele lê o `localStorage` **uma única vez**, na primeira chamada, guardada por um flag
  `inicializado`. Testes que precisam de dados semeados têm de gravar no `localStorage`
  **antes** de importar o módulo — daí o `import()` dinâmico dentro de `beforeAll` em
  `tests/unit/pontosGrafico.spec.ts`.
- Cada arquivo de teste carrega o módulo uma vez só, então não dá para isolar cenários entre
  eles. Prefira testar em `src/domain/`.

> Já existiu aqui um bug de um `watch` colocado atrás de um segundo `if (!inicializado)` na
> mesma função que já havia setado o flag para `true` — ele nunca era registrado. Evite lógica
> guardada por esse flag; use funções puras derivadas do estado.

### Persistência e migrações

Chaves: `cofre_registros`, `cofre_config`, `cofre_objetivos`, `cofre_schema_version`.

`migrarSchema()` roda **uma vez em `src/main.ts`, antes do mount**. Os getters são leitura
pura e nunca gravam. Para mudar o formato dos dados:

1. Suba `SCHEMA_VERSION` em `storageService.ts`.
2. Adicione uma função `migrarNparaN+1` e encadeie-a em `migrarSchema()`.
3. Garanta idempotência — há teste para isso em `tests/unit/migracao.spec.ts`.

`importarBackup()` grava o payload cru, marca a versão declarada no arquivo e chama
`migrarSchema()`, de modo que backups antigos são convertidos ao restaurar.

### Datas

Datas de objetivo são gravadas **ao meio-dia UTC** e lidas com getters **UTC**
(`mesAnoDe` em `src/domain/objetivos.ts`, `paraISO`/`paraInputDate` em `ObjetivoModal.vue`).
Ler com getters locais desloca uma data de meia-noite UTC para o dia anterior em fusos a
oeste — e numa virada de mês isso muda o mês exibido. Mantenha o par UTC de ponta a ponta.

Como os dados são mensais, a UI fala em **meses**, nunca em dias: "levou 8 meses",
"concluído em Mar/25". Dias sugeririam uma precisão que não existe.

### Conclusão de objetivos

Não é observada em tempo real: é **derivada** da série `patrimonioAcumulado`, procurando o
primeiro mês (a partir de `dataInicio`) em que o patrimônio alcançou o alvo. Isso vale
retroativamente para objetivos criados sobre histórico antigo. Uma `dataConclusao` gravada é
uma sobrescrita manual e sempre vence.

### Navegação

Quatro abas (`src/views/TabsPage.vue`): Início · Registros · Análise · Objetivos.
**Configurações fica fora da tab bar** — só pela engrenagem no header da Home.
`/tabs/graficos`, `/tabs/estatisticas` e `/tabs/metas` são redirects das rotas da v1.

O filtro de período é global (no composable) e vale para Home e Análise › Período.
Análise › Histórico e a aba Registros usam sempre o histórico inteiro — isso é intencional.

### Convenções

- Código, comentários e UI em **português**. Mensagens de commit em português sem acentos.
- Tema escuro fixo, cores hardcoded nos componentes (`#161B22` surface, `#0D1117` fundo,
  `#8B5CF6` roxo de destaque, verde/vermelho/ouro para receita/despesa/poupança).
  `src/theme/variables.css` tem os tokens Ionic, mas os componentes em geral não os usam.
- Views e componentes carregam IDs estáveis (`#btn-add-fab`, `#btn-salvar-objetivo`,
  `#input-objetivo-valor`…) pensados para e2e. Mantenha-os ao mexer no markup.
- `tests/e2e/` ainda é o boilerplate do starter Ionic e não roda no CI.
