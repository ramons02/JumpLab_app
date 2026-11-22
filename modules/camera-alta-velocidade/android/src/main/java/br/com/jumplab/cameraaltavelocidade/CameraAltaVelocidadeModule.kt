package br.com.jumplab.cameraaltavelocidade

import android.content.Context
import androidx.camera.lifecycle.ProcessCameraProvider
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/*
 * Câmera de alta velocidade (spec 011, decisão D21). A biblioteca de câmera da stack só usava a sessão
 * comum do Android, que no Samsung vai até 30 ou 60 fps; a câmera lenta exige a sessão de alta
 * velocidade do CameraX, que este módulo usa. Sem áudio e sem rede; o arquivo fica no cache do app.
 */
class CameraAltaVelocidadeModule : Module() {
  private val contexto: Context
    get() = appContext.reactContext ?: throw IllegalStateException("Sem contexto do app.")

  override fun definition() = ModuleDefinition {
    Name("CameraAltaVelocidade")

    // Taxas de alta velocidade que a câmera traseira libera para o app (ex.: [120, 240]); vazio quando
    // o fabricante não publica a sessão de alta velocidade.
    AsyncFunction("taxasAltaVelocidade") Coroutine { ->
      withContext(Dispatchers.IO) {
        val provedor = ProcessCameraProvider.getInstance(contexto).get()
        SessaoAltaVelocidade.taxasSuportadas(provedor)
      }
    }

    View(CameraAltaVelocidadeView::class) {
      Events("onPronta", "onErro")

      Prop("fps") { view: CameraAltaVelocidadeView, fps: Int -> view.fps = fps }
      Prop("ativo") { view: CameraAltaVelocidadeView, ativo: Boolean -> view.ativo = ativo }

      OnViewDidUpdateProps { view: CameraAltaVelocidadeView -> view.aplicar() }

      AsyncFunction("iniciarGravacao") { view: CameraAltaVelocidadeView -> view.iniciarGravacao() }
      AsyncFunction("pararGravacao") { view: CameraAltaVelocidadeView, promessa: Promise ->
        view.pararGravacao(promessa)
      }
      AsyncFunction("cancelarGravacao") { view: CameraAltaVelocidadeView -> view.cancelarGravacao() }

      OnViewDestroys { view: CameraAltaVelocidadeView -> view.liberar() }
    }
  }
}
