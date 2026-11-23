import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AbasAnalisador } from '@/components/AbasAnalisador';
import { AnalisadorAgachamento } from '@/components/AnalisadorAgachamento';
import { AvisoFps } from '@/components/AvisoFps';
import { BotaoVerResultado } from '@/components/BotaoVerResultado';
import { EscolherVideo } from '@/components/EscolherVideo';
import { PainelMarcacao } from '@/components/PainelMarcacao';
import { PlayerQuadros } from '@/components/PlayerQuadros';
import { RodapeMarcacao, type AcaoDoRodape } from '@/components/RodapeMarcacao';
import { useMargemInferior } from '@/components/RodapeFixo';
import { SeletorFps } from '@/components/SeletorFps';
import { SugestaoDaTentativa } from '@/components/SugestaoDaTentativa';
import { VideoDaTentativa } from '@/components/VideoDaTentativa';
import { useConfirmarSaida } from '@/hooks/useConfirmarSaida';
import { usePerfilPaciente } from '@/hooks/usePerfilPaciente';
import { useQuadroPorTentativa } from '@/hooks/useQuadroPorTentativa';
import { useRascunhoAvaliacao, type RascunhoAvaliacao } from '@/hooks/useRascunhoAvaliacao';
import { useTentativaAtual } from '@/hooks/useTentativaAtual';
import type { MarcaDaBarra } from '@/components/BarraDeQuadros';
import type {
  EventoSalto,
  NumeroTentativa,
  PernaTentativa,
  TentativaEmAndamento,
} from '@/types/attempt';
import { avisoDoFps } from '@/utils/fps';
import {
  eventosDoProtocolo,
  LETRA_EVENTO,
  proximoEvento,
  seloDoQuadro,
  tentativaCompleta,
  todasCompletas,
} from '@/utils/marcacoes';
import { pendenciasDaAvaliacao } from '@/utils/pendencias';
import { PROTOCOLOS } from '@/utils/protocolos';
import type { Protocol } from '@/types/protocol';
import {
  marcacoesLiberadas,
  pernasDoProtocolo,
  proximaTentativaIncompleta,
  TENTATIVAS_POR_PERNA,
  type PosicaoTentativa,
} from '@/utils/tentativas';

export default function TelaAnalisador() {
  const { rascunho } = useRascunhoAvaliacao();
  if (!rascunho) return <Redirect href="/" />;
  const pernas = pernasDoProtocolo(rascunho.protocolo);
  if (pernas.length === 0) return <AnalisadorAgachamento rascunho={rascunho} />;
  return <Analisador rascunho={rascunho} pernas={pernas} />;
}

interface AnalisadorProps {
  rascunho: RascunhoAvaliacao;
  pernas: PernaTentativa[];
}

function Analisador({ rascunho, pernas }: AnalisadorProps) {
  const router = useRouter();
  const margemInferior = useMargemInferior();
  const { paciente } = usePerfilPaciente(rascunho.pacienteId);
  const [perna, setPerna] = useState<PernaTentativa>(pernas[0]);
  const [numero, setNumero] = useState<NumeroTentativa>(1);
  const [recusa, setRecusa] = useState<string | null>(null);
  const atual = useTentativaAtual(perna, numero);
  const { tentativa } = atual;
  const { protocolo, tentativas } = rascunho;
  const info = PROTOCOLOS[protocolo];
  const [quadro, setQuadro] = useQuadroPorTentativa(
    `${perna}-${numero}`,
    tentativa.video?.uri ?? null,
  );
  const anterior = numero > 1 ? tentativas[perna]?.[numero - 2] : undefined;
  const completa = (p: PernaTentativa, n: NumeroTentativa) => {
    const t = tentativas[p]?.[n - 1];
    return t ? tentativaCompleta(t, protocolo) : false;
  };
  const prontas = todasCompletas(tentativas, protocolo);

  const escolherTentativa = (novaPerna: PernaTentativa, novoNumero: NumeroTentativa) => {
    setRecusa(null);
    setPerna(novaPerna);
    setNumero(novoNumero);
  };
  const marcar = (evento: EventoSalto) => setRecusa(atual.marcar(evento, quadro));
  const avisoConfirmado =
    tentativa.fpsConfirmado === null ? null : avisoDoFps(tentativa.fpsConfirmado, true);

  useConfirmarSaida(tentativas);

  const acao = acaoDoRodape(perna, tentativa, protocolo, quadro, prontas, () =>
    proximaTentativaIncompleta(tentativas, protocolo, { perna, numero }),
  );
  const irPara = (destino: PosicaoTentativa) => escolherTentativa(destino.perna, destino.numero);
  const { decolagem, aterrissagem } = tentativa.marcas;

  return (
    <View className="flex-1 bg-fundo">
      <ScrollView
        className="flex-1 bg-fundo"
        contentContainerClassName="gap-4 p-4"
        contentContainerStyle={{ paddingBottom: acao ? 24 : 32 + margemInferior }}
      >
        <Text className="text-xs text-textoSecundario">
          {info.nome}
          {paciente ? ` · ${paciente.nome}` : ''}
        </Text>
        <AbasAnalisador
          pernas={pernas}
          pernaAtiva={perna}
          numeroAtivo={numero}
          pernaLesionada={rascunho.pernaLesionada}
          completa={completa}
          aoEscolherPerna={(p) => escolherTentativa(p, 1)}
          aoEscolherNumero={(n) => escolherTentativa(perna, n)}
        />
        {tentativa.video === null && anterior?.video ? (
          <Pressable
            accessibilityRole="button"
            onPress={atual.usarVideoDaAnterior}
            className="items-center rounded-2xl border border-destaque py-3"
          >
            <Text className="text-sm font-semibold text-destaque">
              Mesmo vídeo da tentativa {numero - 1}
            </Text>
          </Pressable>
        ) : null}
        {tentativa.video === null ? (
          <EscolherVideo
            perna={perna}
            numero={numero}
            mensagem={atual.mensagem}
            aoEscolher={atual.escolherVideo}
          />
        ) : (
          <VideoDaTentativa
            perna={perna}
            numero={numero}
            video={tentativa.video}
            fpsConfirmado={tentativa.fpsConfirmado}
            aoTrocarFps={atual.trocarFps}
            aoTrocarVideo={atual.escolherVideo}
          />
        )}
        {tentativa.video ? (
          <PlayerQuadros
            key={tentativa.video.uri}
            video={tentativa.video}
            fpsConfirmado={tentativa.fpsConfirmado}
            quadro={quadro}
            onMudarQuadro={setQuadro}
            marcasDaBarra={marcasDaBarra(tentativa, protocolo)}
            voo={
              decolagem !== undefined && aterrissagem !== undefined
                ? { de: decolagem, ate: aterrissagem }
                : null
            }
            selo={seloDoQuadro(tentativa.marcas, protocolo, quadro)}
          />
        ) : null}
        {atual.mensagem && tentativa.video ? (
          <Text className="text-xs text-erro">{atual.mensagem}</Text>
        ) : null}
        {tentativa.video && tentativa.fpsConfirmado === null ? (
          <SeletorFps
            fpsLido={tentativa.video.fpsLido}
            selecionado={tentativa.fpsSelecionado}
            ehSalto
            aoSelecionar={atual.selecionarFps}
            aoConfirmar={atual.confirmarFps}
          />
        ) : null}
        {avisoConfirmado ? <AvisoFps aviso={avisoConfirmado} /> : null}
        {!marcacoesLiberadas(tentativa) ? (
          <Text className="text-center text-xs text-textoSecundario">
            Confirme o FPS para liberar as marcações.
          </Text>
        ) : null}
        <SugestaoDaTentativa
          protocolo={protocolo}
          perna={perna}
          numero={numero}
          tentativa={tentativa}
          aoIrAoQuadro={setQuadro}
        />
        {tentativa.video ? (
          <PainelMarcacao
            protocolo={protocolo}
            perna={perna}
            numero={numero}
            tentativa={tentativa}
            recusa={recusa}
            aoMarcar={marcar}
            aoIrAoQuadro={setQuadro}
          />
        ) : null}
        <Text className="text-xs text-textoSecundario">
          {TENTATIVAS_POR_PERNA} tentativas{pernas.length > 1 ? ' por perna' : ''}; o resultado é a
          média delas.
        </Text>
        {prontas ? null : (
          <BotaoVerResultado
            pronto={false}
            aoTocar={() => router.push('/assessment/result')}
            pendencias={pendenciasDaAvaliacao(tentativas, protocolo)}
          />
        )}
      </ScrollView>
      {acao ? (
        <RodapeMarcacao
          acao={acao}
          aoMarcar={marcar}
          aoIrPara={irPara}
          aoVerResultado={() => router.push('/assessment/result')}
        />
      ) : null}
    </View>
  );
}

/** Eventos marcados (letra) e sugestão pronta dos que faltam (losango) sobre a barra (D23). */
function marcasDaBarra(tentativa: TentativaEmAndamento, protocolo: Protocol): MarcaDaBarra[] {
  const sugeridos = tentativa.sugestao?.estado === 'pronta' ? tentativa.sugestao.quadros : {};
  return eventosDoProtocolo(protocolo).flatMap((evento): MarcaDaBarra[] => {
    const marcado = tentativa.marcas[evento];
    if (marcado !== undefined)
      return [{ quadro: marcado, rotulo: LETRA_EVENTO[evento], tipo: 'evento' }];
    const sugerido = sugeridos[evento];
    return sugerido !== undefined ? [{ quadro: sugerido, rotulo: '◆', tipo: 'sugestao' }] : [];
  });
}

/**
 * Botão principal do rodapé (D23): marcar o próximo evento, ir para a próxima tentativa incompleta ou
 * ver o resultado. Sem vídeo na tentativa e com outras por fazer, não há rodapé.
 */
function acaoDoRodape(
  perna: PernaTentativa,
  tentativa: TentativaEmAndamento,
  protocolo: Protocol,
  quadro: number,
  prontas: boolean,
  proxima: () => PosicaoTentativa | null,
): AcaoDoRodape | null {
  if (prontas) return { tipo: 'resultado' };
  if (tentativa.video === null) return null;
  const evento = proximoEvento(tentativa.marcas, protocolo);
  if (evento) {
    return { tipo: 'marcar', evento, quadro, liberado: marcacoesLiberadas(tentativa) };
  }
  if (!tentativaCompleta(tentativa, protocolo)) return null;
  const destino = proxima();
  return destino ? { tipo: 'proxima', destino, outraPerna: destino.perna !== perna } : null;
}
