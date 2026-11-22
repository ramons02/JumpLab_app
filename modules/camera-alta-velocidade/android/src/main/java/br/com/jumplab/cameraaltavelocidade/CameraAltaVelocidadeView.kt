package br.com.jumplab.cameraaltavelocidade

import android.content.Context
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.FileOutputOptions
import androidx.camera.video.HighSpeedVideoSessionConfig
import androidx.camera.video.Recorder
import androidx.camera.video.Recording
import androidx.camera.video.VideoCapture
import androidx.camera.video.VideoRecordEvent
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleOwner
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.Promise
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.io.File

private const val NANOS_POR_SEGUNDO = 1_000_000_000.0

/**
 * Pré-visualização e gravação na sessão de alta velocidade. `onPronta` só sai depois que a câmera aceitou
 * a taxa pedida; sem isso a tela não libera o botão de gravar (FR-003: nunca grava em taxa menor).
 */
class CameraAltaVelocidadeView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onPronta by EventDispatcher()
  private val onErro by EventDispatcher()

  var fps: Int = 0
  var ativo: Boolean = false

  private val previewView = PreviewView(context).also { addView(it) }
  private var provedor: ProcessCameraProvider? = null
  private var captura: VideoCapture<Recorder>? = null
  private var configurada: Pair<Int, Boolean>? = null
  private var gravacao: Recording? = null
  private var arquivo: File? = null
  private var promessaParar: Promise? = null
  private var cancelada = false

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    previewView.layout(0, 0, r - l, b - t)
  }

  /** Liga, troca a taxa ou desliga a câmera conforme as props. */
  fun aplicar() {
    val desejada = fps to ativo
    if (desejada == configurada) return
    configurada = desejada
    val futuro = ProcessCameraProvider.getInstance(context)
    futuro.addListener({
      val p = futuro.get().also { provedor = it }
      if (!ativo || fps <= 0) return@addListener p.unbindAll()
      ligar(p)
    }, ContextCompat.getMainExecutor(context))
  }

  private fun ligar(p: ProcessCameraProvider) {
    val dono = appContext.currentActivity as? LifecycleOwner ?: return erro("Câmera indisponível nesta tela.")
    val qualidade = SessaoAltaVelocidade.qualidade(p) ?: return erro("SEM_ALTA_VELOCIDADE")
    val novaCaptura = SessaoAltaVelocidade.novaCaptura(qualidade)
    val preview = Preview.Builder().build().also { it.surfaceProvider = previewView.surfaceProvider }
    val faixa = SessaoAltaVelocidade.faixaPara(SessaoAltaVelocidade.faixas(p, novaCaptura, preview), fps)
      ?: return erro("TAXA_NAO_SUPORTADA")
    val config = HighSpeedVideoSessionConfig.Builder(novaCaptura)
      .setPreview(preview)
      .setFrameRateRange(faixa)
      .setSlowMotionEnabled(false)
      .build()
    try {
      p.unbindAll()
      p.bindToLifecycle(dono, SessaoAltaVelocidade.camera, config)
      captura = novaCaptura
      onPronta(mapOf("fps" to faixa.upper))
    } catch (e: Exception) {
      erro("TAXA_NAO_SUPORTADA")
    }
  }

  fun iniciarGravacao() {
    val saida = captura?.output ?: throw IllegalStateException("A câmera ainda não está pronta.")
    val destino = File(context.cacheDir, "gravacao_${System.currentTimeMillis()}.mp4").also { arquivo = it }
    cancelada = false
    gravacao = saida.prepareRecording(context, FileOutputOptions.Builder(destino).build())
      .start(ContextCompat.getMainExecutor(context)) { evento ->
        if (evento is VideoRecordEvent.Finalize) aoFinalizar(evento, destino)
      }
  }

  fun pararGravacao(promessa: Promise) {
    val atual = gravacao ?: return promessa.reject("SEM_GRAVACAO", "Nenhuma gravação em andamento.", null)
    promessaParar = promessa
    atual.stop()
  }

  fun cancelarGravacao() {
    cancelada = true
    gravacao?.stop() ?: arquivo?.delete()
  }

  private fun aoFinalizar(evento: VideoRecordEvent.Finalize, destino: File) {
    gravacao = null
    val promessa = promessaParar.also { promessaParar = null }
    val falhou = evento.hasError() && evento.error != VideoRecordEvent.Finalize.ERROR_NONE
    if (cancelada || falhou) {
      destino.delete()
      promessa?.reject("GRAVACAO_FALHOU", "Não foi possível gravar o vídeo.", evento.cause)
      if (falhou && !cancelada) erro("GRAVACAO_FALHOU")
      return
    }
    val duracaoS = evento.recordingStats.recordedDurationNanos / NANOS_POR_SEGUNDO
    promessa?.resolve(mapOf("caminho" to destino.absolutePath, "duracaoS" to duracaoS))
  }

  private fun erro(codigo: String) {
    onErro(mapOf("codigo" to codigo))
  }

  fun liberar() {
    cancelarGravacao()
    provedor?.unbindAll()
  }
}
