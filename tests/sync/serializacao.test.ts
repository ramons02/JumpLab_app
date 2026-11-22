import { contemChaveDeVideo, linhaParaConteudo } from '@/sync/serializacao';

describe('serialização', () => {
  it('linhaParaConteudo tira pendente_sync e mantém o resto igual', () => {
    const linha = { id: 'a', nome: 'Ana', pendente_sync: 1, data_lesao: null, carga_kg: 62.5 };
    expect(linhaParaConteudo(linha)).toEqual({
      id: 'a',
      nome: 'Ana',
      data_lesao: null,
      carga_kg: 62.5,
    });
    expect(linha.pendente_sync).toBe(1);
  });

  it('contemChaveDeVideo acha video, videoUri e uri em qualquer nível', () => {
    expect(contemChaveDeVideo({ video: 'x' })).toBe(true);
    expect(contemChaveDeVideo({ avaliacao: { tentativas: [{ videoUri: 'file:///a.mp4' }] } })).toBe(
      true,
    );
    expect(contemChaveDeVideo([{ a: { uri: 'x' } }])).toBe(true);
  });

  it('não acusa conteúdo normal', () => {
    expect(
      contemChaveDeVideo({
        avaliacao: { id: 'a', resultado_json: '{"tipo":"salto"}', melhorias_json: null },
        tentativas: [{ quadro_decolagem: 1000, fps: 240 }],
        serieAgachamento: null,
        repeticoes: [],
      }),
    ).toBe(false);
    expect(contemChaveDeVideo(null)).toBe(false);
  });

  it('as melhorias da spec 017 vão no conteúdo da avaliação, sem chave de vídeo (T025 da 017)', () => {
    const melhorias = JSON.stringify([
      {
        titulo: 'Glúteo médio',
        grupos: [{ grupo: 'gluteo_medio', lado: 'ambas' }],
        motivo: 'citado pelo avaliador',
        foco: '',
        origem: 'avaliador',
      },
    ]);
    const conteudo = {
      avaliacao: linhaParaConteudo({ id: 'a', melhorias_json: melhorias, pendente_sync: 1 }),
    };
    expect(conteudo.avaliacao).toEqual({ id: 'a', melhorias_json: melhorias });
    expect(contemChaveDeVideo(conteudo)).toBe(false);
  });
});
