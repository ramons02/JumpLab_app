import { montarLinkWhatsapp, montarMensagemSenhaTemporaria } from '@/utils/mensagemWhatsapp';

describe('mensagem do WhatsApp', () => {
  it('texto exato com a senha', () => {
    expect(montarMensagemSenhaTemporaria('K7QM-3WZP')).toBe(
      'JumpLab: sua senha temporária é K7QM-3WZP. Vale 24 horas. Ao entrar, crie sua senha nova.',
    );
  });

  it('link wa.me com o texto codificado (acentos e espaços)', () => {
    const link = montarLinkWhatsapp('senha temporária é K7QM-3WZP');
    expect(link).toBe('https://wa.me/?text=senha%20tempor%C3%A1ria%20%C3%A9%20K7QM-3WZP');
    expect(decodeURIComponent(link.replace('https://wa.me/?text=', ''))).toBe(
      'senha temporária é K7QM-3WZP',
    );
  });
});
