import { render, screen } from '@testing-library/react-native';

import { BotaoVerResultado } from '@/components/BotaoVerResultado';

const LINHAS = [
  'Tentativa 1: sem vídeo',
  'Tentativa 2: sem vídeo',
  'Tentativa 3: sem vídeo',
  'Tentativa 4: sem vídeo',
  'Tentativa 5: sem vídeo',
];

describe('BotaoVerResultado', () => {
  it('desabilitado mostra até três pendências e resume o resto', async () => {
    await render(<BotaoVerResultado pronto={false} aoTocar={jest.fn()} pendencias={LINHAS} />);
    expect(screen.getByRole('button', { name: 'Ver resultado' })).toBeDisabled();
    expect(screen.getByText('• Tentativa 3: sem vídeo')).toBeOnTheScreen();
    expect(screen.queryByText('• Tentativa 4: sem vídeo')).toBeNull();
    expect(screen.getByText('e mais 2')).toBeOnTheScreen();
  });

  it('pronto não mostra pendências', async () => {
    await render(<BotaoVerResultado pronto aoTocar={jest.fn()} pendencias={LINHAS} />);
    expect(screen.getByRole('button', { name: 'Ver resultado' })).toBeEnabled();
    expect(screen.queryByTestId('pendencias-resultado')).toBeNull();
  });
});
