/** expo-secure-store em memória para os testes. */
const valores = new Map<string, string>();

export const moduloSecureStore = {
  getItemAsync: jest.fn(async (chave: string) => valores.get(chave) ?? null),
  setItemAsync: jest.fn(async (chave: string, valor: string) => {
    valores.set(chave, valor);
  }),
  deleteItemAsync: jest.fn(async (chave: string) => {
    valores.delete(chave);
  }),
};

export function limparArmazenamentoSeguro() {
  valores.clear();
}

export function valorGuardado(chave: string): string | undefined {
  return valores.get(chave);
}
