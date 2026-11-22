import { act, renderHook } from '@testing-library/react-native';

import {
  RascunhoAvaliacaoProvider,
  useRascunhoAvaliacao,
  type RascunhoAvaliacao,
} from '@/hooks/useRascunhoAvaliacao';

const RASCUNHO: RascunhoAvaliacao = {
  pacienteId: '11111111-1111-4111-8111-111111111111',
  protocolo: 'cmj_bi',
  cargaKg: null,
  dataHora: '2026-11-22T10:30',
  pernaLesionada: 'direita',
};

function renderizar() {
  return renderHook(() => useRascunhoAvaliacao(), { wrapper: RascunhoAvaliacaoProvider });
}

describe('useRascunhoAvaliacao', () => {
  it('começa sem rascunho', async () => {
    const { result } = await renderizar();
    expect(result.current.rascunho).toBeNull();
  });

  it('iniciarRascunho guarda os dados', async () => {
    const { result } = await renderizar();
    await act(async () => result.current.iniciarRascunho(RASCUNHO));
    expect(result.current.rascunho).toEqual(RASCUNHO);
  });

  it('iniciar de novo substitui o rascunho inteiro', async () => {
    const { result } = await renderizar();
    await act(async () => result.current.iniciarRascunho(RASCUNHO));
    const novo: RascunhoAvaliacao = { ...RASCUNHO, protocolo: 'agach', cargaKg: 60 };
    await act(async () => result.current.iniciarRascunho(novo));
    expect(result.current.rascunho).toEqual(novo);
  });

  it('descartarRascunho limpa', async () => {
    const { result } = await renderizar();
    await act(async () => result.current.iniciarRascunho(RASCUNHO));
    await act(async () => result.current.descartarRascunho());
    expect(result.current.rascunho).toBeNull();
  });

  it('fora do provider lança erro', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(renderHook(() => useRascunhoAvaliacao())).rejects.toThrow(
      'useRascunhoAvaliacao precisa estar dentro de RascunhoAvaliacaoProvider.',
    );
    jest.restoreAllMocks();
  });
});
