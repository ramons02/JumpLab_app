import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CampoTexto } from '@/components/CampoTexto';
import { EsqueciSenha } from '@/components/EsqueciSenha';
import { useAvisoDeDemora } from '@/hooks/useAvisoDeDemora';
import type { ResultadoHttp } from '@/sync/clienteHttp';
import type { DadosCriarConta, ErrosConta, Sessao } from '@/types/conta';
import { validarCriarConta, validarEntrar } from '@/utils/validacaoConta';

export const MENSAGEM_SEM_CONEXAO =
  'Sem conexão. O app continua funcionando; entre quando houver internet.';

export const MENSAGEM_ACORDANDO =
  'Acordando o servidor... Depois de um tempo sem uso, a primeira entrada pode levar até 1 minuto.';
/** Depois deste tempo esperando a resposta, o formulário avisa que o servidor pode estar acordando. */
export const ESPERA_ANTES_DO_AVISO_MS = 4_000;

export type ModoConta = 'entrar' | 'criar';

interface FormularioContaProps {
  modo: ModoConta;
  aoEntrar: (email: string, senha: string) => Promise<ResultadoHttp<Sessao>>;
  aoCriar: (dados: DadosCriarConta) => Promise<ResultadoHttp<Sessao>>;
  aoPedirRecuperacao: (email: string) => Promise<ResultadoHttp<null>>;
  aoConcluir: (mensagem: string | null) => void;
}

/** Campos de entrar ou criar conta, com as mensagens e o botão travado durante a chamada. */
export function FormularioConta({
  modo,
  aoEntrar,
  aoCriar,
  aoPedirRecuperacao,
  aoConcluir,
}: FormularioContaProps) {
  const [dados, setDados] = useState<DadosCriarConta>({
    nome: '',
    email: '',
    senha: '',
    confirmacao: '',
  });
  const [erros, setErros] = useState<ErrosConta>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const emAndamento = useRef(false);
  const demorando = useAvisoDeDemora(enviando, ESPERA_ANTES_DO_AVISO_MS);
  const criar = modo === 'criar';

  const mudar = (campo: keyof DadosCriarConta) => (valor: string) =>
    setDados((atual) => ({ ...atual, [campo]: valor }));

  async function enviar() {
    if (emAndamento.current) return;
    const encontrados = criar ? validarCriarConta(dados) : validarEntrar(dados.email, dados.senha);
    setErros(encontrados);
    setMensagem(null);
    if (Object.keys(encontrados).length > 0) return;
    emAndamento.current = true;
    setEnviando(true);
    try {
      const resultado = criar ? await aoCriar(dados) : await aoEntrar(dados.email, dados.senha);
      if (resultado.tipo === 'ok') {
        aoConcluir(criar ? 'Conta criada.' : null);
        return;
      }
      setMensagem(
        resultado.tipo === 'erro'
          ? resultado.mensagem
          : resultado.tipo === 'sem-conexao'
            ? MENSAGEM_SEM_CONEXAO
            : 'Sua sessão expirou. Entre de novo para sincronizar.',
      );
      // Mantém nome e e-mail; limpa só as senhas.
      setDados((atual) => ({ ...atual, senha: '', confirmacao: '' }));
    } finally {
      emAndamento.current = false;
      setEnviando(false);
    }
  }

  return (
    <View className="gap-3">
      {criar ? (
        <CampoTexto
          rotulo="Nome"
          valor={dados.nome}
          aoMudar={mudar('nome')}
          erro={erros.nome}
          autoComplete="name"
        />
      ) : null}
      <CampoTexto
        rotulo="E-mail"
        valor={dados.email}
        aoMudar={mudar('email')}
        erro={erros.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <CampoTexto
        rotulo="Senha"
        valor={dados.senha}
        aoMudar={mudar('senha')}
        erro={erros.senha}
        secureTextEntry
        autoCapitalize="none"
      />
      {criar ? (
        <CampoTexto
          rotulo="Confirmar senha"
          valor={dados.confirmacao}
          aoMudar={mudar('confirmacao')}
          erro={erros.confirmacao}
          secureTextEntry
          autoCapitalize="none"
        />
      ) : null}
      {demorando ? (
        <Text accessibilityRole="text" className="text-xs text-textoSecundario">
          {MENSAGEM_ACORDANDO}
        </Text>
      ) : null}
      {mensagem ? (
        <Text accessibilityRole="alert" className="text-xs text-erro">
          {mensagem}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: enviando }}
        disabled={enviando}
        onPress={enviar}
        className={`items-center rounded-2xl bg-destaque py-3 ${enviando ? 'opacity-60' : ''}`}
      >
        <Text className="text-sm font-semibold text-fundo">{criar ? 'Criar conta' : 'Entrar'}</Text>
      </Pressable>
      {criar ? null : <EsqueciSenha email={dados.email} aoPedir={aoPedirRecuperacao} />}
    </View>
  );
}
