// O expo-crypto é nativo; nos testes, o UUID vem do crypto do Node, com o mesmo formato (v4).
jest.mock('expo-crypto', () => ({
  randomUUID: () => globalThis.crypto.randomUUID(),
}));

// O expo-secure-store é nativo; nos testes, um armazenamento em memória (spec 012).
jest.mock(
  'expo-secure-store',
  () => jest.requireActual('./helpers/armazenamentoSeguroFalso').moduloSecureStore,
);
