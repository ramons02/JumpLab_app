package br.com.jumplab.cameraaltavelocidade

import android.util.Range
import androidx.camera.core.CameraSelector
import androidx.camera.core.DynamicRange
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.video.HighSpeedVideoSessionConfig
import androidx.camera.video.Quality
import androidx.camera.video.QualitySelector
import androidx.camera.video.Recorder
import androidx.camera.video.VideoCapture

/** Montagem da sessão de alta velocidade da câmera traseira e a leitura das taxas que ela aceita. */
internal object SessaoAltaVelocidade {
  private const val TAXA_MINIMA = 120

  val camera: CameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

  /** Qualidade de vídeo aceita em alta velocidade (720p em muitos aparelhos); null se não houver. */
  fun qualidade(provedor: ProcessCameraProvider): Quality? {
    if (!provedor.hasCamera(camera)) return null
    val capacidades = Recorder.getHighSpeedVideoCapabilities(provedor.getCameraInfo(camera)) ?: return null
    return capacidades.getSupportedQualities(DynamicRange.SDR).firstOrNull()
  }

  fun novaCaptura(qualidade: Quality): VideoCapture<Recorder> =
    VideoCapture.withOutput(Recorder.Builder().setQualitySelector(QualitySelector.from(qualidade)).build())

  /** Faixas de quadros por segundo aceitas pela sessão de alta velocidade desta câmera. */
  fun faixas(provedor: ProcessCameraProvider, captura: VideoCapture<Recorder>, preview: Preview): Set<Range<Int>> {
    val config = HighSpeedVideoSessionConfig(captura, preview)
    return provedor.getCameraInfo(camera).getSupportedFrameRateRanges(config)
  }

  fun taxasSuportadas(provedor: ProcessCameraProvider): List<Int> {
    val qualidade = qualidade(provedor) ?: return emptyList()
    return faixas(provedor, novaCaptura(qualidade), Preview.Builder().build())
      .map { it.upper }
      .filter { it >= TAXA_MINIMA }
      .distinct()
      .sorted()
  }

  /** A faixa fixa na taxa pedida (ex.: 240-240) se existir; senão a que termina nela. */
  fun faixaPara(faixas: Set<Range<Int>>, fps: Int): Range<Int>? =
    faixas.filter { it.upper == fps }.maxByOrNull { it.lower }
}
