import { act, renderHook } from '@testing-library/react-native';

import { ESPERA_ANTES_DO_AVISO_MS, MENSAGEM_ACORDANDO } from '@/components/FormularioConta';
import { useAvisoDeDemora } from '@/hooks/useAvisoDeDemora';

describe('useAvisoDeDemora (login com o servidor acordando)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('só avisa depois da espera e o aviso some quando a chamada termina', async () => {
    const { result, rerender } = await renderHook(
      ({ ativo }: { ativo: boolean }) => useAvisoDeDemora(ativo, ESPERA_ANTES_DO_AVISO_MS),
      { initialProps: { ativo: true } },
    );
    expect(result.current).toBe(false);
    await act(async () => jest.advanceTimersByTime(ESPERA_ANTES_DO_AVISO_MS - 1));
    expect(result.current).toBe(false);
    await act(async () => jest.advanceTimersByTime(1));
    expect(result.current).toBe(true);

    await rerender({ ativo: false });
    expect(result.current).toBe(false);
  });

  it('inativo nunca avisa', async () => {
    const { result } = await renderHook(() => useAvisoDeDemora(false, 10));
    await act(async () => jest.advanceTimersByTime(1000));
    expect(result.current).toBe(false);
  });

  it('o aviso diz que o servidor está acordando e quanto pode levar', () => {
    expect(ESPERA_ANTES_DO_AVISO_MS).toBe(4_000);
    expect(MENSAGEM_ACORDANDO).toBe(
      'Acordando o servidor... Depois de um tempo sem uso, a primeira entrada pode levar até 1 minuto.',
    );
  });
});
