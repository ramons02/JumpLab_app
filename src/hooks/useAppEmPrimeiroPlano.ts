import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

function emPrimeiroPlano(estado: AppStateStatus | string | null | undefined): boolean {
  return estado !== 'background';
}

/** Falso só quando o sistema informa que o app foi para segundo plano. */
export function useAppEmPrimeiroPlano(): boolean {
  const [ativo, setAtivo] = useState(() => emPrimeiroPlano(AppState.currentState));
  useEffect(() => {
    const assinatura = AppState.addEventListener('change', (estado) =>
      setAtivo(emPrimeiroPlano(estado)),
    );
    return () => assinatura.remove();
  }, []);
  return ativo;
}
