import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { RodapeFixo } from '@/components/RodapeFixo';

const BARRA_DO_ANDROID = { top: 24, right: 0, bottom: 48, left: 0 };

describe('RodapeFixo', () => {
  it('soma a barra de navegação do Android ao espaço de baixo', async () => {
    await render(
      <SafeAreaInsetsContext.Provider value={BARRA_DO_ANDROID}>
        <RodapeFixo>
          <Text>Botão</Text>
        </RodapeFixo>
      </SafeAreaInsetsContext.Provider>,
    );
    expect(screen.getByTestId('rodape-fixo')).toHaveStyle({ paddingBottom: 16 + 48 });
  });

  it('sem área segura (aparelho sem barra ou teste), fica só o espaço padrão', async () => {
    await render(
      <RodapeFixo>
        <Text>Botão</Text>
      </RodapeFixo>,
    );
    expect(screen.getByTestId('rodape-fixo')).toHaveStyle({ paddingBottom: 16 });
  });
});
