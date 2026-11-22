import type { Protocol } from '@/types/protocol';
import { ORDEM_PROTOCOLOS } from '@/utils/protocolos';
import { validarConfiguracao } from '@/utils/validacaoConfiguracao';

const SALTOS = ORDEM_PROTOCOLOS.filter((p) => p !== 'agach') as Protocol[];

describe('validarConfiguracao: protocolo', () => {
  it('sem protocolo pede que escolha', () => {
    expect(validarConfiguracao(null, '')).toEqual({ ok: false, erro: 'Escolha o protocolo.' });
  });

  it.each(SALTOS)('%s com carga vazia é válido, sem carga', (protocolo) => {
    expect(validarConfiguracao(protocolo, '')).toEqual({ ok: true, cargaKg: null });
  });

  it('protocolo de salto ignora a carga digitada antes', () => {
    expect(validarConfiguracao('cmj_bi', '62,5')).toEqual({ ok: true, cargaKg: null });
  });
});
