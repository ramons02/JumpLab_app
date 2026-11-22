import type { Protocol } from '@/types/protocol';

/** Guia do "Como fazer" de um protocolo: textos do protótipo validado e o vídeo embarcado (D9). */
export interface GuiaProtocolo {
  passos: string[];
  objetivo: string;
  dicaFilmagem: string;
  video: number;
}

export const DICA_FILMAGEM_SALTO =
  'Filme de frente, celular parado na altura do joelho, corpo inteiro e pés visíveis, a 120 ou 240 fps.';

export const DICA_FILMAGEM_AGACHAMENTO =
  'Filme de lado, celular parado na altura do quadril, com o disco inteiro visível. 60 fps já basta.';

export const COMO_FAZER: Record<Protocol, GuiaProtocolo> = {
  cmj_bi: {
    passos: [
      'De pé, pés na largura do quadril, mãos na cintura.',
      'Agachamento rápido até cerca de 90° de joelho e, sem parar embaixo, salto o mais alto possível.',
      'Pouso com as duas pernas, joelhos estendidos e ponta do pé, como na saída.',
    ],
    objetivo: 'Potência das pernas usando a "mola" do movimento.',
    dicaFilmagem: DICA_FILMAGEM_SALTO,
    video: require('../../assets/videos/como-fazer/cmj_bi.mp4'),
  },
  cmj_uni: {
    passos: [
      'Apoio numa perna só, mãos na cintura; a outra perna fica dobrada, sem tocar o chão.',
      'Agachamento rápido e salto máximo na mesma perna.',
      'Pouso na mesma perna. Faça uma perna e depois a outra, cada uma num vídeo.',
    ],
    objetivo: 'Altura de cada perna; o LSI compara a operada com a sadia.',
    dicaFilmagem: DICA_FILMAGEM_SALTO,
    video: require('../../assets/videos/como-fazer/cmj_uni.mp4'),
  },
  sj: {
    passos: [
      'Mãos na cintura, desça até cerca de 90° de joelho.',
      'Fique parado 2 a 3 segundos embaixo.',
      'Salte o mais alto possível sem descer antes. Se houver balanço para baixo, a tentativa não vale.',
    ],
    objetivo: 'Força concêntrica pura, sem a ajuda da mola.',
    dicaFilmagem: DICA_FILMAGEM_SALTO,
    video: require('../../assets/videos/como-fazer/sj.mp4'),
  },
  dj: {
    passos: [
      'Em cima da caixa (20 a 40 cm), mãos na cintura.',
      'Dê um passo para fora, sem pular da caixa.',
      'Toque o chão com as duas pernas e salte de novo o mais alto e o mais rápido possível, ficando o mínimo de tempo no chão.',
    ],
    objetivo: 'Reatividade: tempo de contato, altura e RSI.',
    dicaFilmagem: DICA_FILMAGEM_SALTO,
    video: require('../../assets/videos/como-fazer/dj.mp4'),
  },
  dj_uni: {
    passos: [
      'Em cima de uma caixa baixa (15 a 20 cm), apoio numa perna só.',
      'Passo para fora e toque o chão com a mesma perna.',
      'Salte de novo o mais rápido e alto possível. Faça uma perna e depois a outra.',
    ],
    objetivo: 'RSI de cada perna; o LSI compara as duas pelo RSI.',
    dicaFilmagem: DICA_FILMAGEM_SALTO,
    video: require('../../assets/videos/como-fazer/dj_uni.mp4'),
  },
  agach: {
    passos: [
      'Barra apoiada nas costas, pés na largura dos ombros.',
      'Desça controlado até a profundidade combinada.',
      'Suba o mais rápido possível, com intenção máxima em todas as repetições.',
      'Filme de lado: o disco precisa aparecer inteiro e redondo no vídeo, para a calibração.',
    ],
    objetivo: 'Velocidade da barra em cada repetição e perda de velocidade (fadiga).',
    dicaFilmagem: DICA_FILMAGEM_AGACHAMENTO,
    video: require('../../assets/videos/como-fazer/agach.mp4'),
  },
};
