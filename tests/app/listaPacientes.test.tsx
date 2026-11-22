import { act, fireEvent, screen, waitFor } from 'expo-router/testing-library';

import { inserirPaciente } from '@/database/pacientes';
import type { DadosPaciente, Patient } from '@/types/patient';
import { calcularIdade, hojeIso } from '@/utils/datas';
import { ESPACO_FINAL_PX, FATOR_PARALLAX } from '@/utils/poseDesenho';

import { limparArmazenamentoSeguro } from '../helpers/armazenamentoSeguroFalso';
import { criarServidorSync, entrarComo } from '../helpers/servidorSyncFalso';
import { abrirApp, bancoDaTela, fecharBanco, prepararBanco } from '../helpers/telas';

jest.mock('expo-sqlite', () => ({
  useSQLiteContext: () => jest.requireActual('../helpers/telas').bancoDaTela(),
}));

const ANA: DadosPaciente = {
  nome: 'Ana Souza',
  dataNascimento: '1995-03-15',
  perfil: 'pos_lca',
  pernaLesionada: 'direita',
  dataLesao: '2026-08-10',
};
const MONICA: DadosPaciente = {
  nome: 'Mônica Araújo',
  dataNascimento: '1990-06-01',
  perfil: 'corredor',
  pernaLesionada: 'nenhuma',
  dataLesao: null,
};
const BRUNO: DadosPaciente = {
  nome: 'Bruno Lima',
  dataNascimento: '1988-07-02',
  perfil: 'corredor',
  pernaLesionada: 'esquerda',
  dataLesao: '2026-02-01',
};

async function cadastrar(...dados: DadosPaciente[]): Promise<Patient[]> {
  const salvos: Patient[] = [];
  for (const d of dados) salvos.push(await inserirPaciente(bancoDaTela(), d));
  return salvos;
}

async function avaliar(pacienteId: string, dataHora: string) {
  await bancoDaTela().runAsync(
    `INSERT INTO avaliacao (id, paciente_id, protocolo, data_hora, perna_lesionada, carga_kg,
       observacoes, resultado_json, criado_em, atualizado_em, pendente_sync)
     VALUES (?, ?, 'cmj_bi', ?, 'direita', NULL, '', '{}', 'x', 'x', 1)`,
    `av-${dataHora}`,
    pacienteId,
    dataHora,
  );
}

/** Nomes dos pacientes na ordem em que aparecem na tela. */
function nomesNaTela(): string[] {
  return screen
    .queryAllByText(/^(Ana Souza|Mônica Araújo|Bruno Lima)$/)
    .map((texto) => String(texto.props.children));
}

function idade(nascimento: string) {
  return calcularIdade(nascimento, hojeIso());
}

describe('tela de lista de pacientes', () => {
  beforeEach(async () => {
    await prepararBanco();
  });

  afterEach(() => fecharBanco());

  describe('US1: ver a lista', () => {
    it('sem pacientes mostra a mensagem e o botão que abre o cadastro', async () => {
      const app = await abrirApp('/');
      expect(await screen.findByText('Nenhum paciente cadastrado ainda.')).toBeOnTheScreen();

      await fireEvent.press(screen.getByText('+ Novo Paciente'));

      await waitFor(() => expect(app.getPathname()).toBe('/patient/new'));
    });

    it('mostra os dados de cada item, em ordem alfabética', async () => {
      const [ana] = await cadastrar(MONICA, ANA, BRUNO);
      await avaliar(ana.id, '2026-11-20T18:30');
      await abrirApp('/');

      await screen.findByText('Ana Souza');
      expect(nomesNaTela()).toEqual(['Ana Souza', 'Bruno Lima', 'Mônica Araújo']);
      expect(
        screen.getByText(`Pós-LCA · ${idade(ANA.dataNascimento)} anos · perna lesionada: direita`),
      ).toBeOnTheScreen();
      expect(screen.getByText('Última avaliação em 20/11/2026')).toBeOnTheScreen();
      expect(screen.getAllByText('Sem avaliações')).toHaveLength(2);
    });

    it('com itens, o botão + Novo Paciente continua disponível', async () => {
      await cadastrar(ANA);
      await abrirApp('/');
      await screen.findByText('Ana Souza');
      expect(screen.getByText('+ Novo Paciente')).toBeOnTheScreen();
    });

    it('tocar num item abre o perfil do paciente', async () => {
      const [ana] = await cadastrar(ANA);
      const app = await abrirApp('/');

      await fireEvent.press(await screen.findByText('Ana Souza'));

      await waitFor(() => expect(app.getPathname()).toBe(`/patient/${ana.id}`));
    });

    it('ao voltar para a lista, mostra o paciente gravado enquanto ela estava fora', async () => {
      await cadastrar(ANA);
      const app = await abrirApp('/');
      await screen.findByText('Ana Souza');
      await fireEvent.press(screen.getByText('+ Novo Paciente'));
      await waitFor(() => expect(app.getPathname()).toBe('/patient/new'));

      await cadastrar(BRUNO);
      await act(async () => {
        const { router } = jest.requireActual('expo-router');
        router.back();
      });

      expect(await screen.findByText('Bruno Lima')).toBeOnTheScreen();
    });
  });

  describe('US2: filtrar e buscar', () => {
    beforeEach(async () => {
      await cadastrar(ANA, MONICA, BRUNO);
    });

    it('abre com Todos selecionado', async () => {
      await abrirApp('/');
      await screen.findByText('Ana Souza');
      expect(screen.getByRole('radio', { name: 'Todos' })).toBeChecked();
      expect(nomesNaTela()).toHaveLength(3);
    });

    it('Corredor mostra só corredores', async () => {
      await abrirApp('/');
      await screen.findByText('Ana Souza');

      await fireEvent.press(screen.getByRole('radio', { name: 'Corredor' }));

      expect(nomesNaTela()).toEqual(['Bruno Lima', 'Mônica Araújo']);
    });

    it('a busca filtra a cada letra, sem acento', async () => {
      await abrirApp('/');
      await screen.findByText('Ana Souza');

      await fireEvent.changeText(screen.getByLabelText('Buscar por nome'), 'mo');
      expect(nomesNaTela()).toEqual(['Mônica Araújo']);
      await fireEvent.changeText(screen.getByLabelText('Buscar por nome'), 'monica');
      expect(nomesNaTela()).toEqual(['Mônica Araújo']);
    });

    it('filtro e busca juntos', async () => {
      await abrirApp('/');
      await screen.findByText('Ana Souza');

      await fireEvent.press(screen.getByRole('radio', { name: 'Corredor' }));
      await fireEvent.changeText(screen.getByLabelText('Buscar por nome'), 'lima');

      expect(nomesNaTela()).toEqual(['Bruno Lima']);
    });

    it('busca sem resultado mostra "Nenhum paciente encontrado." e o botão de cadastro', async () => {
      await abrirApp('/');
      await screen.findByText('Ana Souza');

      await fireEvent.changeText(screen.getByLabelText('Buscar por nome'), 'zzz');

      expect(screen.getByText('Nenhum paciente encontrado.')).toBeOnTheScreen();
      expect(screen.getByText('+ Novo Paciente')).toBeOnTheScreen();
    });
  });

  describe('US3: identidade visual e topo ilustrado', () => {
    it('o cabeçalho mostra o símbolo do JumpLab', async () => {
      await abrirApp('/');
      expect(await screen.findByLabelText('JumpLab')).toBeOnTheScreen();
    });

    it('o topo "Meça cada salto" aparece mesmo com a lista vazia, e há o espaço final', async () => {
      await abrirApp('/');
      await screen.findByText('Nenhum paciente cadastrado ainda.');
      expect(screen.getByText('Meça cada salto')).toBeOnTheScreen();
      expect(screen.getByText('Role a lista para saltar')).toBeOnTheScreen();
      expect(screen.getByTestId('espaco-final')).toHaveStyle({ height: ESPACO_FINAL_PX });
    });

    it('rolar a lista desce o topo mais devagar que a lista', async () => {
      await cadastrar(ANA, MONICA, BRUNO);
      await abrirApp('/');
      await screen.findByText('Ana Souza');
      const ROLAGEM = 40;

      await fireEvent.scroll(screen.getByTestId('topo-parallax').parent!.parent!, {
        nativeEvent: {
          contentOffset: { x: 0, y: ROLAGEM },
          contentSize: { width: 400, height: 1400 },
          layoutMeasurement: { width: 400, height: 800 },
        },
      });

      const topo = screen.getByTestId('topo-parallax');
      expect(topo.children[0]).toHaveStyle({
        transform: [{ translateY: ROLAGEM * FATOR_PARALLAX }],
      });
    });
  });

  describe('marca de pendente de sincronização (spec 013)', () => {
    const DADOS = {
      nome: 'Ana Souza',
      dataNascimento: '1995-03-15',
      perfil: 'pos_lca' as const,
      pernaLesionada: 'direita' as const,
      dataLesao: '2026-05-20',
    };

    beforeEach(() => {
      limparArmazenamentoSeguro();
    });

    it('com sessão, paciente pendente aparece com a marca', async () => {
      const servidor = criarServidorSync();
      servidor.instalar();
      // A rodada da abertura falha sem conexão: o paciente continua pendente.
      servidor.falhar('enviar', 'rede');
      await inserirPaciente(bancoDaTela(), DADOS);
      await entrarComo('ana@exemplo.com');

      await abrirApp('/');

      expect(await screen.findByLabelText('Pendente de sincronização')).toBeOnTheScreen();
    });

    it('sem sessão, nenhuma marca', async () => {
      await inserirPaciente(bancoDaTela(), DADOS);
      await abrirApp('/');
      await screen.findByText('Ana Souza');
      expect(screen.queryByLabelText('Pendente de sincronização')).toBeNull();
    });
  });
});
