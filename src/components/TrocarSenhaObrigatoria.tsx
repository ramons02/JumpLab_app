import { useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { CampoTexto } from '@/components/CampoTexto';
import { useSessao } from '@/hooks/useSessao';
import { validarSenhaNova } from '@/utils/validacaoConta';

export const MENSAGEM_ENTROU_TEMPORARIA = 'Entrou com a senha temporária. Crie sua senha nova.';
export const MENSAGEM_SENHA_NOVA_SALVA = 'Senha nova salva. A senha temporária deixou de valer.';
export const MENSAGEM_SENHA_NOVA_SEM_CONEXAO = 'Sem conexão. A senha nova precisa de internet.';

/**
 * Tela cheia por cima da navegação enquanto a sessão tem troca de senha pendente (spec 016, R10).
 * "Sair da conta" evita que o app fique preso sem internet (D17); os dados locais continuam.
 */
function Formulario() {
  const { criarSenhaNova, sair } = useSessao();
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<{ senha?: string; confirmacao?: string }>({});
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const emAndamento = useRef(false);

  async function salvar() {
    if (emAndamento.current) return;
    const encontrados = validarSenhaNova(senha, confirmacao);
    setErros(encontrados);
    setMensagem(null);
    if (Object.keys(encontrados).length > 0) return;
    emAndamento.current = true;
    setSalvando(true);
    try {
      const resultado = await criarSenhaNova(senha);
      if (resultado.tipo === 'ok') return;
      setMensagem(resultado.tipo === 'erro' ? resultado.mensagem : MENSAGEM_SENHA_NOVA_SEM_CONEXAO);
    } finally {
      emAndamento.current = false;
      setSalvando(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-fundo" contentContainerClassName="gap-4 p-6 pt-16">
      <Text className="font-titulo text-3xl uppercase text-texto">Crie sua senha nova</Text>
      <Text className="text-sm text-textoSecundario">
        Você entrou com uma senha temporária. Para continuar, defina a sua senha.
      </Text>
      <Text className="text-xs text-aviso">{MENSAGEM_ENTROU_TEMPORARIA}</Text>
      <CampoTexto
        rotulo="Senha nova"
        valor={senha}
        aoMudar={setSenha}
        erro={erros.senha}
        secureTextEntry
      />
      <CampoTexto
        rotulo="Confirmar senha nova"
        valor={confirmacao}
        aoMudar={setConfirmacao}
        erro={erros.confirmacao}
        secureTextEntry
      />
      {mensagem ? (
        <Text accessibilityRole="alert" className="text-xs text-erro">
          {mensagem}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: salvando }}
        disabled={salvando}
        onPress={salvar}
        className={`items-center rounded-2xl bg-destaque py-4 ${salvando ? 'opacity-60' : ''}`}
      >
        <Text className="text-sm font-semibold text-fundo">Salvar senha nova</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => void sair()}
        className="items-center rounded-2xl border border-borda py-4"
      >
        <Text className="text-sm font-semibold text-texto">Sair da conta</Text>
      </Pressable>
    </ScrollView>
  );
}

/** Mostra a navegação e, com a troca pendente, a tela de senha nova por cima de qualquer aba. */
export function CamadaTrocaSenha({ children }: { children: ReactNode }) {
  const { conta } = useSessao();
  return (
    <View className="flex-1">
      {children}
      {conta?.trocaSenhaObrigatoria ? (
        <View testID="troca-senha-obrigatoria" className="absolute inset-0">
          <Formulario />
        </View>
      ) : null}
    </View>
  );
}
