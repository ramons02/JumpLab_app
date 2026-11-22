# JumpLab_app

Aplicativo Android do JumpLab para avaliação biomecânica de saltos por vídeo, offline. Regras do
projeto na constituição do [JumpLab_documentacao](https://github.com/ramons02/JumpLab_documentacao)
(`.specify/memory/constitution.md`).

## Stack

| Peça      | Versão                                                                                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expo SDK  | 58 (React Native 0.88, React 19.3)                                                                                                                                                      |
| Node      | 24 (o SDK 58 exige 22.13 ou mais novo; ver `.nvmrc`)                                                                                                                                    |
| Navegação | Expo Router, rotas em `src/app/`                                                                                                                                                        |
| Estilos   | NativeWind 4 (Tailwind 3), cores do tema em `tailwind.config.js`                                                                                                                        |
| Banco     | `expo-sqlite`, migrações por `PRAGMA user_version` em `src/database/migracoes.ts`                                                                                                       |
| Testes    | Jest (`jest-expo`), Testing Library, SQLite real em memória (`better-sqlite3`)                                                                                                          |
| Desenho   | `react-native-svg` (símbolo e personagem do topo; também exigida pelos gráficos)                                                                                                        |
| Gráficos  | `react-native-gifted-charts` (stack) nos gráficos de evolução do perfil (spec 009); exige o `expo-linear-gradient`, que entra só por isso, e o `react-native-svg`, que já estava no app |
| Fonte     | Bebas Neue nos títulos, empacotada pelo `expo-font` (licença SIL OFL, em `assets/fonts/`)                                                                                               |
| Vídeo     | `expo-image-picker` e `expo-video`; `expo-file-system` só para apagar a cópia temporária do vídeo ao fim da avaliação (D14)                                                             |
| Câmera    | módulo nativo próprio `modules/camera-alta-velocidade` (CameraX, sessão de alta velocidade), gravação a 120 e 240 fps sem áudio (spec 011, D21)                                         |

## Estrutura

```text
src/
├── app/          # telas (Expo Router), sem SQL nem regra
├── components/   # peças de tela
├── hooks/        # estado das telas (useX)
├── database/     # acesso ao SQLite, uma função por operação
├── theme/        # paleta (cores.js), fonte e símbolo do JumpLab
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

O app roda como Development Build (o Expo Go não é alvo). Depois de instalar uma biblioteca com código
nativo (como `react-native-svg` ou `expo-font`), gere o build de novo:

```bash
npm run android                       # npx expo run:android
```

## Gravação em alta velocidade (spec 011)

A câmera do app grava a 120 ou 240 fps, sem áudio, pela sessão de alta velocidade do CameraX
(`HighSpeedVideoSessionConfig`), num módulo nativo próprio em `modules/camera-alta-velocidade/` (D21). A
biblioteca de câmera usada antes só abria a sessão comum, que no Samsung vai até 30 ou 60 fps. O vídeo
fica só em `cache/gravacoes/` até o fim da avaliação (D14). Depois de mexer no módulo, gere um
Development Build novo (`npm run android`).

- Ao abrir a tela, o app pergunta à câmera traseira as taxas de alta velocidade que ela libera e abre na
  maior. Se o aparelho não libera nenhuma, a tela orienta filmar na câmera lenta do próprio celular e
  importar pela galeria.
- A permissão `CAMERA` vem do `app.json`; o microfone fica bloqueado, porque a gravação é sem áudio.

Aparelhos testados a 240 e a 120 fps: a registrar na validação em aparelho (quickstart da spec 011).

## Verificações

```bash
npm run lint
npm run typecheck
npm test
npx prettier --check .
```

As quatro devem passar sem erro antes de abrir um PR.

## Teste D1: navegação quadro a quadro (spec 006)

Teste no aparelho que decide a técnica do analisador. Precisa de `ffmpeg` só na máquina de
desenvolvimento.

1. Gere os vídeos de teste (vão para `videos-d1/`, fora do git):

   ```bash
   scripts/gerar-videos-d1.sh
   ```

   - `d1_240_nativo.mp4`: 5 s, faixa a 240 fps, 1200 quadros;
   - `d1_240_em_30.mp4`: os mesmos 1200 quadros com a faixa a 30 fps (40 s).

   Cada imagem tem o número do quadro (a partir de 0) impresso no centro.

2. Copie os dois vídeos para o aparelho (`adb push videos-d1/*.mp4 /sdcard/Movies/`) e grave
   também um vídeo em câmera lenta filmando um cronômetro de milissegundos.
3. Com o build de desenvolvimento instalado, abra a rota provisória:

   ```bash
   adb shell am start -a android.intent.action.VIEW -d "jumplab://dev/teste-d1"
   ```

4. Escolha o vídeo, marque a taxa da faixa (240 para o nativo, 30 para o regravado) e siga o
   procedimento do `quickstart.md` da spec 006: 100 toques em `+1 Frame`, 100 em `-1 Frame`, 20
   posições na barra e 10 sequências de 5 toques rápidos, comparando o número da imagem com o
   "Quadro N / último" da tela.

## Vídeos demonstrativos do "Como fazer" (spec 015)

Os seis MP4 de `assets/videos/como-fazer/` são a animação do boneco do protótipo validado, já em
0,5x, sem som. Para regenerar (por exemplo, depois de mudar a animação no protótipo):

1. Abra `ferramentas/videos-demonstrativos/exportar.html` no Chrome ou no Edge, toque em `Exportar` e
   escolha uma pasta vazia: a página grava os PNG de cada protocolo (600 x 800, 30 quadros por
   segundo).
2. Monte os vídeos:

   ```bash
   ferramentas/videos-demonstrativos/montar.sh <pasta-dos-png>
   ```

O `ffmpeg` e o navegador são ferramentas só da máquina de desenvolvimento; não entram no app. A soma dos
seis arquivos precisa ficar abaixo de 6 MB (testado em `tests/utils/comoFazer.test.ts`).

## Conta e API (spec 012)

A conta é opcional e serve só para sincronizar; o app funciona inteiro sem ela. O endereço da API vem
de `EXPO_PUBLIC_API_URL` (veja `.env.example`): copie para `.env` e preencha. Em desenvolvimento pode
ser `http://<ip-da-maquina>:8080` (API subida pelo `JumpLab_infra`); em build de produção o app só
aceita `https://`. Os tokens ficam no armazenamento seguro do aparelho (`expo-secure-store`) e nunca
vão para log.
