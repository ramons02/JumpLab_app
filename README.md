# JumpLab_app

Aplicativo Android do JumpLab para avaliação biomecânica de saltos por vídeo, offline. Regras do
projeto na constituição do [JumpLab_documentacao](https://github.com/ramons02/JumpLab_documentacao)
(`.specify/memory/constitution.md`).

## Stack

| Peça      | Versão                                                                            |
| --------- | --------------------------------------------------------------------------------- |
| Expo SDK  | 58 (React Native 0.88, React 19.3)                                                |
| Node      | 24 (o SDK 58 exige 22.13 ou mais novo; ver `.nvmrc`)                              |
| Navegação | Expo Router, rotas em `src/app/`                                                  |
| Estilos   | NativeWind 4 (Tailwind 3), cores do tema em `tailwind.config.js`                  |
| Banco     | `expo-sqlite`, migrações por `PRAGMA user_version` em `src/database/migracoes.ts` |
| Testes    | Jest (`jest-expo`), Testing Library, SQLite real em memória (`better-sqlite3`)    |

## Estrutura

```text
src/
├── app/          # telas (Expo Router), sem SQL nem regra
├── components/   # peças de tela
├── hooks/        # estado das telas (useX)
├── database/     # acesso ao SQLite, uma função por operação
├── types/        # tipos do domínio
└── utils/        # funções puras (datas, validação, rótulos)
tests/            # mesma divisão de src/, mais helpers/
```

## Preparar

```bash
nvm use                               # Node 24
npm install
git config core.hooksPath .githooks   # uma vez por clone: liga o hook commit-msg
```

O hook recusa mensagens de commit com travessão, meia-risca, emoji, `Co-Authored-By`,
"Generated with" ou menção a IA.

## Rodar no Android

O app roda como Development Build (o Expo Go não é alvo):

```bash
npm run android                       # npx expo run:android
```

## Verificações

```bash
npm run lint
npm run typecheck
npm test
npx prettier --check .
```

As quatro devem passar sem erro antes de abrir um PR.
