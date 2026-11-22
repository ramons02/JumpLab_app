// O expo-crypto é nativo; nos testes, o UUID vem do crypto do Node, com o mesmo formato (v4).
jest.mock('expo-crypto', () => ({
  randomUUID: () => globalThis.crypto.randomUUID(),
}));
