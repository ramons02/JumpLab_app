import { useCallback, useEffect, useState } from 'react';
import { PermissionsAndroid } from 'react-native';

export type StatusPermissaoCamera = 'verificando' | 'concedida' | 'pode_pedir' | 'bloqueada';

const CAMERA = PermissionsAndroid.PERMISSIONS.CAMERA;

/**
 * Permissão da câmera pedida só na tela de gravação, depois do motivo explicado (FR-007). "Bloqueada" é
 * quando o Android não mostra mais o pedido: só pelas configurações do aparelho.
 */
export function usePermissaoCamera() {
  const [status, setStatus] = useState<StatusPermissaoCamera>('verificando');

  useEffect(() => {
    let ativo = true;
    PermissionsAndroid.check(CAMERA).then((concedida) => {
      if (ativo) setStatus(concedida ? 'concedida' : 'pode_pedir');
    });
    return () => {
      ativo = false;
    };
  }, []);

  const pedir = useCallback(async () => {
    const resposta = await PermissionsAndroid.request(CAMERA);
    if (resposta === PermissionsAndroid.RESULTS.GRANTED) setStatus('concedida');
    else if (resposta === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) setStatus('bloqueada');
  }, []);

  return { status, pedir };
}
