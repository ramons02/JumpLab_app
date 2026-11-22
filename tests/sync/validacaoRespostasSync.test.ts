import {
  lerPaginaRecebimento,
  lerResultadoEnvio,
  RespostaInvalidaError,
  validarAvaliacaoRecebida,
  validarPacienteRecebido,
} from '@/sync/validacaoRespostas';

const ID = '6f1c0a52-8a9e-4a4e-9a51-0f5f3b0b8c11';
const AV = '0b7d5f0e-3c1a-4d43-8f0e-6a2d9b7c4e21';

const paciente = {
  id: ID,
  nome: 'Ana Souza',
  data_nascimento: '1995-03-15',
  perfil: 'pos_lca',
  perna_lesionada: 'direita',
  data_lesao: '2026-08-10',
  criado_em: '2026-11-22T13:58:00.000Z',
  atualizado_em: '2026-11-22T14:03:10.120Z',
};

const avaliacao = {
  avaliacao: {
    id: AV,
    paciente_id: ID,
    protocolo: 'cmj_bi',
    data_hora: '2026-11-22T10:30',
    perna_lesionada: 'direita',
    carga_kg: null,
    observacoes: '',
    resultado_json: '{"versao":1}',
    criado_em: '2026-11-22T14:10:00.000Z',
    atualizado_em: '2026-11-22T14:10:00.000Z',
    melhorias_json: null,
  },
  tentativas: [{ perna: 'unica', numero: 1, fps: 240 }],
  serieAgachamento: null,
  repeticoes: [],
};

describe('lerResultadoEnvio', () => {
  it('lê a situação de cada registro', () => {
    expect(
      lerResultadoEnvio({
        sucesso: true,
        dados: {
          resultados: [
            { tipo: 'paciente', id: ID, situacao: 'aceito', motivo: null },
            {
              tipo: 'avaliacao',
              id: AV,
              situacao: 'recusado',
              motivo: 'Paciente não encontrado na conta.',
            },
          ],
        },
      }),
    ).toEqual([
      { tipo: 'paciente', id: ID, situacao: 'aceito', motivo: null },
      {
        tipo: 'avaliacao',
        id: AV,
        situacao: 'recusado',
        motivo: 'Paciente não encontrado na conta.',
      },
    ]);
  });

  it('formato inesperado lança RespostaInvalidaError', () => {
    expect(() => lerResultadoEnvio({ dados: {} })).toThrow(RespostaInvalidaError);
    expect(() =>
      lerResultadoEnvio({ dados: { resultados: [{ tipo: 'x', id: ID, situacao: 'aceito' }] } }),
    ).toThrow(RespostaInvalidaError);
    expect(() =>
      lerResultadoEnvio({
        dados: { resultados: [{ tipo: 'paciente', id: ID, situacao: 'talvez' }] },
      }),
    ).toThrow(RespostaInvalidaError);
  });
});

describe('lerPaginaRecebimento', () => {
  const pagina = (extra: Record<string, unknown> = {}) => ({
    sucesso: true,
    dados: {
      pacientes: [{ id: ID, atualizadoEm: paciente.atualizado_em, conteudo: paciente }],
      avaliacoes: [
        { id: AV, pacienteId: ID, atualizadoEm: '2026-11-22T14:10:00.000Z', conteudo: avaliacao },
      ],
      cursor: 12,
      temMais: false,
      ...extra,
    },
  });

  it('lê pacientes, avaliações, cursor e temMais', () => {
    const lida = lerPaginaRecebimento(pagina());
    expect(lida.cursor).toBe(12);
    expect(lida.temMais).toBe(false);
    expect(lida.pacientes[0]).toMatchObject({ tipo: 'paciente', id: ID });
    expect(lida.avaliacoes[0]).toMatchObject({ tipo: 'avaliacao', pacienteId: ID });
  });

  it('cursor negativo, temMais ausente ou avaliação sem paciente lançam erro', () => {
    expect(() => lerPaginaRecebimento(pagina({ cursor: -1 }))).toThrow(RespostaInvalidaError);
    expect(() => lerPaginaRecebimento(pagina({ temMais: undefined }))).toThrow(
      RespostaInvalidaError,
    );
    expect(() =>
      lerPaginaRecebimento(
        pagina({ avaliacoes: [{ id: AV, atualizadoEm: 'x', conteudo: avaliacao }] }),
      ),
    ).toThrow(RespostaInvalidaError);
  });
});

describe('validarPacienteRecebido e validarAvaliacaoRecebida', () => {
  it('aceitam o formato do app', () => {
    expect(validarPacienteRecebido(paciente)).toBe(true);
    expect(validarPacienteRecebido({ ...paciente, data_lesao: null })).toBe(true);
    expect(validarAvaliacaoRecebida(avaliacao)).toBe(true);
  });

  it('recusam valores fora das opções e datas não ISO', () => {
    expect(validarPacienteRecebido({ ...paciente, perfil: 'atleta' })).toBe(false);
    expect(validarPacienteRecebido({ ...paciente, perna_lesionada: 'ambas' })).toBe(false);
    expect(validarPacienteRecebido({ ...paciente, data_nascimento: '15/03/1995' })).toBe(false);
    expect(validarPacienteRecebido({ ...paciente, id: 'x' })).toBe(false);
  });

  it('recusam o agregado fora da forma', () => {
    expect(validarAvaliacaoRecebida({ ...avaliacao, tentativas: 'x' })).toBe(false);
    expect(
      validarAvaliacaoRecebida({
        ...avaliacao,
        avaliacao: { ...avaliacao.avaliacao, protocolo: 'corrida' },
      }),
    ).toBe(false);
    expect(validarAvaliacaoRecebida({ tentativas: [], repeticoes: [] })).toBe(false);
  });
});
