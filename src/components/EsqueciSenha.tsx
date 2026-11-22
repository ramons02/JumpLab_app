import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { ResultadoHttp } from '@/sync/clienteHttp';
import { emailValido } from '@/utils/validacaoConta';

export const MENSAGEM_PEDIDO_ENVIADO =
  'Pedido enviado. O administrador vai gerar uma senha temporária para você.';
export const MENSAGEM_DIGITE_EMAIL =
  'Digite seu e-mail acima e toque de novo em "Esqueci minha senha".';
export const MENSAGEM_PEDIDO_SEM_CONEXAO = 'Sem conexão. O pedido precisa de internet.';

function mensagemDoPedido(resultado: ResultadoHttp<null>): string {
  if (resultado.tipo === 'ok') return MENSAGEM_PEDIDO_ENVIADO;
  if (resultado.tipo === 'erro') return resultado.mensagem;
  return MENSAGEM_PEDIDO_SEM_CONEXAO;
}

/**
 * Pede ao administrador a recuperação da senha com o e-mail digitado no Entrar (spec 016, D13). Sem
 * e-mail válido, só orienta, sem chamar a API.
 */
export function EsqueciSenha({
  email,
  aoPedir,
}: {
  email: string;
  aoPedir: (email: string) => Promise<ResultadoHttp<null>>;
}) {
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const emAndamento = useRef(false);

  async function pedir() {
    if (emAndamento.current) return;
    if (!emailValido(email)) return setMensagem(MENSAGEM_DIGITE_EMAIL);
    emAndamento.current = true;
    setEnviando(true);
    try {
      setMensagem(mensagemDoPedido(await aoPedir(email)));
    } finally {
      emAndamento.current = false;
      setEnviando(false);
    }
  }

  return (
    <View className="items-center gap-1">
      <Pressable accessibilityRole="button" disabled={enviando} onPress={pedir} className="py-1">
        <Text className="text-xs font-semibold text-destaque">Esqueci minha senha</Text>
      </Pressable>
      {mensagem ? (
        <Text className="text-center text-xs text-textoSecundario">{mensagem}</Text>
      ) : null}
    </View>
  );
}
