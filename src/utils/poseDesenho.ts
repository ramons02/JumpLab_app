import type { BracoDesenho, EstadoPersonagem, PernaDesenho, PoseDesenho } from '@/types/personagem';

// Topo ilustrado (D16). Valores do protótipo validado. É só ilustração: nada aqui lê, calcula ou
// mostra medida da avaliação (princípio III); a escala é do desenho, não conversão de unidade.

/** Rolagem em que o salto completa. */
export const FAIXA_SALTO_MAX_PX = 110;
/** Faixa mínima quando a lista rola pouco. */
export const FAIXA_SALTO_MIN_PX = 60;
/** O topo desce 45% da rolagem (fica mais lento que a lista). */
export const FATOR_PARALLAX = 0.45;
/** Opacidade cai até 1 - 0,55 no salto completo. */
export const ESMAECIMENTO_MAXIMO = 0.55;
/** Espaço no fim da lista para sempre haver rolagem. */
export const ESPACO_FINAL_PX = 140;
/** Fases do salto pelo progresso da rolagem. */
export const FIM_AGACHAMENTO = 0.35;
export const FIM_IMPULSO = 0.45;
export const FIM_SUBIDA = 0.9;
/** Escala da ilustração: altura medida para subida do desenho. */
export const PX_DESENHO_POR_CM = 1.65;
/** Teto da subida do desenho. */
export const SUBIDA_MAXIMA_PX = 65;
/** Subida sem medida (perfil sem salto). */
export const SUBIDA_PADRAO_PX = 35;
/** Subida fixa na lista de pacientes. */
export const SUBIDA_LISTA_PX = 53;

const AGACHAMENTO_MAXIMO = 0.9;
/** Abaixo disso o desenho ainda conta como apoiado no chão. */
const LIMIAR_NO_AR_PX = 2;

// Proporções do personagem de frente, em px do viewBox.
const COXA = 52;
const CANELA = 50;
const TRONCO = 66;
const BRACO = 34;
const ANTEBRACO = 32;
const CABECA = 21;
const AFASTAMENTO_PES = 15;
const ALTURA_PE = 12;
const LARGURA_QUADRIL = 11;
const LARGURA_OMBROS = 25;
const ABERTURA_JOELHOS = 13;
const RESPIRACAO_PX = 1.2;
const RESPIRACAO_RITMO = 2.2;

export const ESTADO_PARADO: EstadoPersonagem = {
  agachamento: 0,
  subidaPx: 0,
  bracos: 0,
  barra: false,
};

const limitar = (valor: number, minimo: number, maximo: number) =>
  Math.min(maximo, Math.max(minimo, valor));

/** 0 a 1: quanto do salto a rolagem já percorreu. */
export function progressoDaRolagem(rolagemY: number, alturaRolavel: number): number {
  const faixa = limitar(alturaRolavel, FAIXA_SALTO_MIN_PX, FAIXA_SALTO_MAX_PX);
  return limitar(rolagemY / faixa, 0, 1);
}

/** Agacha com os braços para trás, impulsiona com os braços para cima e sobe até `subidaPx`. */
export function estadoDoSalto(progresso: number, subidaPx: number): EstadoPersonagem {
  if (progresso <= 0) return ESTADO_PARADO;
  if (progresso < FIM_AGACHAMENTO) {
    const fase = progresso / FIM_AGACHAMENTO;
    return {
      ...ESTADO_PARADO,
      agachamento: Math.sin((Math.PI / 2) * fase) * AGACHAMENTO_MAXIMO,
      bracos: -fase,
    };
  }
  if (progresso < FIM_IMPULSO) {
    const fase = (progresso - FIM_AGACHAMENTO) / (FIM_IMPULSO - FIM_AGACHAMENTO);
    return { ...ESTADO_PARADO, agachamento: AGACHAMENTO_MAXIMO * (1 - fase), bracos: 1 };
  }
  const fase = Math.min((progresso - FIM_IMPULSO) / (FIM_SUBIDA - FIM_IMPULSO), 1);
  return { ...ESTADO_PARADO, subidaPx: subidaPx * fase, bracos: 1 };
}

/** Subida do desenho para uma altura de salto (cm), pela escala da ilustração, com teto. */
export function saltoDoDesenhoPx(alturaCm: number | null): number {
  if (alturaCm === null) return SUBIDA_PADRAO_PX;
  return Math.min(alturaCm * PX_DESENHO_POR_CM, SUBIDA_MAXIMA_PX);
}

function ehParado(estado: EstadoPersonagem): boolean {
  return estado.agachamento === 0 && estado.subidaPx === 0 && estado.bracos === 0 && !estado.barra;
}

function perna(lado: 1 | -1, agachamento: number): PernaDesenho {
  const pe = { x: lado * AFASTAMENTO_PES, y: -ALTURA_PE };
  const joelho = {
    x: lado * (AFASTAMENTO_PES + ABERTURA_JOELHOS * agachamento),
    y: pe.y - CANELA * (1 - 0.12 * agachamento),
  };
  return { pe, joelho, levantada: false };
}

function braco(lado: 1 | -1, estado: EstadoPersonagem, yOmbro: number): BracoDesenho {
  const ombro = { x: lado * LARGURA_OMBROS, y: yOmbro + 4 };
  if (estado.barra) {
    return {
      ombro,
      cotovelo: { x: lado * 46, y: yOmbro + 6 },
      mao: { x: lado * 34, y: yOmbro - 10 },
    };
  }
  const b = estado.bracos;
  // Ângulo do braço visto de lado: 0 = para baixo, positivo = à frente e para cima (escorço).
  const angulo = (b > 0 ? b * 2.8 : b * 0.9) + (b === 0 ? estado.agachamento : 0);
  const abertura = 7 + 12 * Math.abs(Math.sin(angulo));
  const cotovelo = { x: ombro.x + lado * abertura * 0.6, y: ombro.y + BRACO * Math.cos(angulo) };
  const mao = { x: ombro.x + lado * abertura, y: cotovelo.y + ANTEBRACO * Math.cos(angulo + 0.35) };
  return { ombro, cotovelo, mao };
}

/** Articulações do personagem de frente; com o estado parado, respira de leve com o tempo. */
export function poseDesenho(estado: EstadoPersonagem, segundos: number): PoseDesenho {
  const a = estado.agachamento;
  const respira = ehParado(estado) ? Math.sin(segundos * RESPIRACAO_RITMO) * RESPIRACAO_PX : 0;
  const pernaDireita = perna(1, a);
  const pernaEsquerda = perna(-1, a);
  const yQuadril = pernaDireita.joelho.y - COXA * Math.cos(1.25 * a) + respira * 0.3;
  const yOmbro = yQuadril - TRONCO * (1 - 0.18 * a) + respira;
  return {
    pernaDireita,
    pernaEsquerda,
    quadril: {
      direito: { x: LARGURA_QUADRIL, y: yQuadril },
      esquerdo: { x: -LARGURA_QUADRIL, y: yQuadril },
    },
    yOmbro,
    cabeca: { x: 0, y: yOmbro - CABECA - 7 },
    bracoDireito: braco(1, estado, yOmbro),
    bracoEsquerdo: braco(-1, estado, yOmbro),
    noAr: estado.subidaPx > LIMIAR_NO_AR_PX,
    deslocamentoY: -estado.subidaPx,
  };
}

/** Raio da cabeça, usado pelo desenho. */
export const RAIO_CABECA = CABECA;
