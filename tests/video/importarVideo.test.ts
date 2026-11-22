import * as ImagePicker from 'expo-image-picker';
import { createVideoPlayer } from 'expo-video';

import { importarVideoDaGaleria, lerTaxaDoVideo } from '@/video/importarVideo';

const CACHE = 'file:///data/user/0/br.com.jumplab.app/cache/';

jest.mock('expo-file-system', () => ({
  Paths: { cache: { uri: 'file:///data/user/0/br.com.jumplab.app/cache/' } },
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  VideoExportPreset: { Passthrough: 0 },
}));

type Ouvinte = (payload: unknown) => void;

/** Tocador simulado: guarda os ouvintes e deixa o teste disparar o carregamento. */
const mockTocador = {
  ouvintes: {} as Record<string, Ouvinte>,
  release: jest.fn(),
  addListener: jest.fn((evento: string, ouvinte: Ouvinte) => {
    mockTocador.ouvintes[evento] = ouvinte;
    return { remove: jest.fn() };
  }),
};

jest.mock('expo-video', () => ({ createVideoPlayer: jest.fn(() => mockTocador) }));

const pedirPermissao = jest.mocked(ImagePicker.requestMediaLibraryPermissionsAsync);
const abrirGaleria = jest.mocked(ImagePicker.launchImageLibraryAsync);

/** Faz o mockTocador simulado "carregar" o vídeo com a taxa informada, logo depois de criado. */
function carregarCom(taxa: number | null) {
  jest.mocked(createVideoPlayer).mockImplementationOnce(() => {
    setTimeout(() =>
      mockTocador.ouvintes.sourceLoad?.({
        availableVideoTracks: taxa === null ? [] : [{ frameRate: taxa }],
      }),
    );
    return mockTocador as never;
  });
}

function escolher(uri: string, extras: Partial<ImagePicker.ImagePickerAsset> = {}) {
  abrirGaleria.mockResolvedValue({
    canceled: false,
    assets: [{ uri, width: 1080, height: 1920, fileName: 'salto.mp4', duration: 4000, ...extras }],
  } as ImagePicker.ImagePickerResult);
}

describe('importarVideoDaGaleria', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTocador.ouvintes = {};
    pedirPermissao.mockResolvedValue({
      granted: true,
    } as ImagePicker.MediaLibraryPermissionResponse);
  });

  it('permissão negada não abre a galeria', async () => {
    pedirPermissao.mockResolvedValue({
      granted: false,
    } as ImagePicker.MediaLibraryPermissionResponse);
    expect(await importarVideoDaGaleria()).toEqual({ tipo: 'permissao_negada' });
    expect(abrirGaleria).not.toHaveBeenCalled();
  });

  it('cancelado devolve cancelado', async () => {
    abrirGaleria.mockResolvedValue({ canceled: true, assets: null });
    expect(await importarVideoDaGaleria()).toEqual({ tipo: 'cancelado' });
  });

  it('abre a galeria só com vídeos, sem edição e sem recompressão', async () => {
    escolher(`${CACHE}a.mp4`);
    carregarCom(240);
    await importarVideoDaGaleria();
    expect(abrirGaleria).toHaveBeenCalledWith({
      mediaTypes: ['videos'],
      allowsEditing: false,
      allowsMultipleSelection: false,
      videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
    });
  });

  it('lê a taxa da faixa, arredonda e marca a cópia do cache como temporária', async () => {
    escolher(`${CACHE}salto.mp4`);
    carregarCom(239.76);
    expect(await importarVideoDaGaleria()).toEqual({
      tipo: 'ok',
      video: {
        uri: `${CACHE}salto.mp4`,
        nome: 'salto.mp4',
        duracaoS: 4,
        fpsLido: 240,
        fpsDoArquivo: 240,
        temporario: true,
      },
    });
    expect(mockTocador.release).toHaveBeenCalledTimes(1);
  });

  it('faixa sem taxa dá FPS nulo; arquivo fora do cache não é temporário', async () => {
    escolher('content://media/external/video/1', { fileName: null });
    carregarCom(null);
    const resultado = await importarVideoDaGaleria();
    expect(resultado).toMatchObject({
      tipo: 'ok',
      video: { fpsLido: null, fpsDoArquivo: null, temporario: false, nome: 'video.mp4' },
    });
  });

  it('falha ao abrir devolve erro', async () => {
    abrirGaleria.mockRejectedValue(new Error('falhou'));
    expect(await importarVideoDaGaleria()).toEqual({ tipo: 'erro' });
  });
});

describe('lerTaxaDoVideo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTocador.ouvintes = {};
  });

  it('erro do mockTocador dá null e libera o mockTocador', async () => {
    jest.mocked(createVideoPlayer).mockImplementationOnce(() => {
      setTimeout(() => mockTocador.ouvintes.statusChange?.({ status: 'error' }));
      return mockTocador as never;
    });
    expect(await lerTaxaDoVideo('file:///x.mp4')).toBeNull();
    expect(mockTocador.release).toHaveBeenCalledTimes(1);
  });

  it('sem resposta do mockTocador, desiste no limite de tempo e libera', async () => {
    jest.useFakeTimers();
    jest.mocked(createVideoPlayer).mockImplementationOnce(() => mockTocador as never);
    const leitura = lerTaxaDoVideo('file:///x.mp4');
    jest.advanceTimersByTime(5000);
    expect(await leitura).toBeNull();
    expect(mockTocador.release).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
