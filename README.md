<div align="center">

# 🔒 Cofre

**Acompanhe a evolução do seu patrimônio com dois números por mês.**

[![CI](https://img.shields.io/github/actions/workflow/status/barbieri97/cofre/ci.yml?branch=main&style=flat-square&label=ci)](https://github.com/barbieri97/cofre/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/barbieri97/cofre?style=flat-square&color=10B981)](https://github.com/barbieri97/cofre/releases/latest)
[![Data do release](https://img.shields.io/github/release-date/barbieri97/cofre?style=flat-square&color=F59E0B&label=atualizado)](https://github.com/barbieri97/cofre/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/barbieri97/cofre/total?style=flat-square&color=8B5CF6)](https://github.com/barbieri97/cofre/releases)
[![Android](https://img.shields.io/badge/Android-7.0%2B-3DDC84?style=flat-square&logo=android&logoColor=white)](https://github.com/barbieri97/cofre/releases/latest)

[![Vue](https://img.shields.io/badge/Vue-3-4FC08D?style=flat-square&logo=vuedotjs&logoColor=white)](https://vuejs.org)
[![Ionic](https://img.shields.io/badge/Ionic-8-3880FF?style=flat-square&logo=ionic&logoColor=white)](https://ionicframework.com)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

[**⬇️ Baixar APK**](https://github.com/barbieri97/cofre/releases/latest)

</div>

---

## A ideia

A maioria dos apps de finanças pede que você categorize cada café. O Cofre pede duas coisas
por mês: **quanto entrou** e **quanto saiu**. Só isso.

Em troca, ele mostra a curva do seu patrimônio ao longo dos anos, quanto tempo você
aguentaria sem nenhuma receita nova, e quando você chega nos seus objetivos no ritmo atual.

Um registro por mês, dois campos. Menos de trinta segundos.

## O que ele faz

**📈 Evolução do patrimônio** — a curva desde o seu ponto de partida, por mês ou agregada por
ano para comparar anos inteiros entre si.

**🛡️ Fôlego** — quantos meses o seu patrimônio cobre, mantendo o padrão de gastos, se nenhuma
receita nova entrar. A média pode considerar os últimos 3, 6, 12 meses ou todo o histórico, e
o app mostra uma faixa conforme seus gastos variam.

**🎯 Objetivos rastreáveis** — quantos quiser, com prazo opcional e estimativa de chegada
baseada no seu crescimento real. Nada é apagado ao concluir: o histórico fica, e tudo continua
editável. Objetivos já atingidos no passado são detectados sozinhos.

**📊 Análise** — receita × despesa, taxa de poupança, crescimento patrimonial, médias dos
últimos 12 meses, recordes históricos e tabela detalhada.

**⚠️ Meses faltantes** — como cada mês é um registro único, um mês esquecido não deixa buraco
visível: ele apenas distorce as médias em silêncio. O app avisa.

**💾 Backup em JSON** — exporte e importe quando quiser. Backups de versões antigas são
migrados automaticamente na importação.

## Privacidade

Não há servidor, conta, login ou telemetria. Tudo fica no `localStorage` do próprio aparelho.
O backup em JSON é seu único meio de levar os dados para outro lugar — e a única forma de
recuperá-los se você desinstalar o app.

## Instalação

Baixe o APK do [último release](https://github.com/barbieri97/cofre/releases/latest) e
instale. O Android vai pedir permissão para instalar de fonte desconhecida, já que o app não
está na Play Store.

> [!IMPORTANT]
> Ao atualizar da **1.0.x para a 1.1.0**, os dados são migrados para um formato novo e a
> versão antiga não os lê mais. Exporte um backup antes, por precaução — ele continua
> restaurável na versão nova.

## Desenvolvimento

```bash
npm install
npm run dev          # http://localhost:5173
```

```bash
npx vitest run       # testes unitários
npm run lint         # eslint
npm run build        # typecheck + build de produção
```

Para gerar o APK localmente (requer Java 17 e o Android SDK):

```bash
npm run build && npx cap sync android
cd android && ./gradlew assembleRelease
```

### Como está organizado

| Caminho | O que é |
|---|---|
| `src/domain/` | Regras de negócio como funções puras — fôlego, objetivos, lacunas |
| `src/composables/usePatrimonio.ts` | Estado reativo global e todos os agregados |
| `src/services/storageService.ts` | `localStorage`, migrações de schema e backup |
| `src/views/` | As quatro abas + Configurações |
| `src/components/` | Gráfico, modais e cards reutilizáveis |

Detalhes de arquitetura e as armadilhas que valem conhecer estão em
[`CLAUDE.md`](CLAUDE.md).

### CI e releases

Todo push em `main` roda lint, testes e build. Releases saem de tags: `npm version
<patch|minor|major>` cria o commit e a tag, e o push da tag dispara o workflow que compila o
APK assinado e publica o release.

## Stack

Vue 3 · Ionic 8 · Capacitor 8 · TypeScript · Chart.js · Vite · Vitest

---

<div align="center">
<sub>Feito para quem quer acompanhar o patrimônio sem virar contador.</sub>
</div>
