# deteccao-pose

Módulo nativo local (Expo Modules API, Kotlin, só Android) da spec 018: acha os pés em cada quadro do
vídeo com o MediaPipe Pose Landmarker, no aparelho e sem internet.

- Biblioteca: `com.google.mediapipe:tasks-vision` 1.2.3, licença Apache 2.0.
- Modelo: `pose_landmarker_lite.task` (float16, versão 1), Apache 2.0, empacotado em
  `android/src/main/assets/` (SHA-256 `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a`).
- Lê os quadros com `MediaMetadataRetriever.getFrameAtIndex` (Android 9 ou mais novo).
- Exige Development Build novo: `npx expo run:android` depois de puxar este módulo. O Expo Go não tem
  o módulo.
- Nos testes (Jest), o módulo é trocado por `tests/helpers/mockDeteccaoPose.ts`.
