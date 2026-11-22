import fs from 'fs';
import path from 'path';

import { ORDEM_PROTOCOLOS } from '@/utils/protocolos';
import { COMO_FAZER, DICA_FILMAGEM_AGACHAMENTO, DICA_FILMAGEM_SALTO } from '@/utils/comoFazer';

const PASTA_VIDEOS = path.join(__dirname, '../../assets/videos/como-fazer');
const LIMITE_BYTES = 6 * 1024 * 1024;

describe('COMO_FAZER', () => {
  it('cobre os seis protocolos', () => {
    expect(Object.keys(COMO_FAZER).sort()).toEqual([...ORDEM_PROTOCOLOS].sort());
  });

  it.each(ORDEM_PROTOCOLOS)('%s tem vídeo, pelo menos 3 passos, objetivo e dica', (protocolo) => {
    const guia = COMO_FAZER[protocolo];
    expect(guia.video).toBeDefined();
    expect(guia.passos.length).toBeGreaterThanOrEqual(3);
    guia.passos.forEach((passo) => expect(passo.trim()).not.toBe(''));
    expect(guia.objetivo.trim()).not.toBe('');
    expect(guia.dicaFilmagem.trim()).not.toBe('');
  });

  it('o agachamento é filmado de lado e os saltos de frente', () => {
    expect(COMO_FAZER.agach.dicaFilmagem).toBe(DICA_FILMAGEM_AGACHAMENTO);
    expect(DICA_FILMAGEM_AGACHAMENTO).toMatch(/^Filme de lado/);
    ORDEM_PROTOCOLOS.filter((p) => p !== 'agach').forEach((protocolo) => {
      expect(COMO_FAZER[protocolo].dicaFilmagem).toBe(DICA_FILMAGEM_SALTO);
    });
    expect(DICA_FILMAGEM_SALTO).toMatch(/^Filme de frente/);
  });

  it('existe um MP4 por protocolo e a soma fica abaixo de 6 MB', () => {
    const total = ORDEM_PROTOCOLOS.reduce(
      (soma, protocolo) => soma + fs.statSync(path.join(PASTA_VIDEOS, `${protocolo}.mp4`)).size,
      0,
    );
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThan(LIMITE_BYTES);
  });
});
