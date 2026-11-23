package br.com.jumplab.leituravideo

import android.content.Context
import android.graphics.Bitmap
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream

/*
 * Leitura da taxa de gravação nos dados do arquivo (decisão D22): a taxa de captura que a câmera grava
 * no vídeo de câmera lenta e a contagem de quadros da faixa de vídeo pela duração dela. Também gera as
 * miniaturas da fita de quadros do analisador (D23). Nada sai do aparelho; o que não puder ser lido
 * volta null.
 */
class LeituraVideoModule : Module() {
  private val contexto: Context
    get() = appContext.reactContext ?: throw IllegalStateException("Sem contexto do app.")

  override fun definition() = ModuleDefinition {
    Name("LeituraVideo")

    AsyncFunction("lerDadosDoVideo") Coroutine { uri: String ->
      withContext(Dispatchers.IO) { lerDados(Uri.parse(uri)) }
    }

    AsyncFunction("extrairQuadros") Coroutine { uri: String, temposS: List<Double>, largura: Int ->
      withContext(Dispatchers.IO) { extrair(uri, temposS, largura) }
    }

    OnDestroy { soltarLeitor() }
  }

  // Um leitor aberto por vez, para o vídeo da tentativa na tela: abrir o arquivo é a parte cara.
  private val trava = Any()
  private var leitor: MediaMetadataRetriever? = null
  private var uriDoLeitor: String? = null

  private fun soltarLeitor() = synchronized(trava) {
    leitor?.release()
    leitor = null
    uriDoLeitor = null
  }

  private fun pastaDasMiniaturas(): File = File(contexto.cacheDir, PASTA_MINIATURAS)

  /** Leitor do vídeo; trocar de vídeo apaga as miniaturas do anterior (o cache fica com um só). */
  private fun leitorDe(uri: String): MediaMetadataRetriever {
    leitor?.let { if (uriDoLeitor == uri) return it }
    leitor?.release()
    pastaDasMiniaturas().deleteRecursively()
    val novo = MediaMetadataRetriever()
    novo.setDataSource(contexto, Uri.parse(uri))
    leitor = novo
    uriDoLeitor = uri
    return novo
  }

  /** Uma imagem JPEG por tempo pedido, no quadro mais próximo; null onde não deu para ler. */
  private fun extrair(uri: String, temposS: List<Double>, largura: Int): List<String?> {
    synchronized(trava) {
      val retriever = try {
        leitorDe(uri)
      } catch (_: Exception) {
        leitor?.release()
        leitor = null
        uriDoLeitor = null
        return temposS.map { null }
      }
      val pasta = pastaDasMiniaturas().apply { mkdirs() }
      val chave = uri.hashCode().toUInt().toString(16)
      return temposS.map { tempoS ->
        val tempoUs = Math.round(tempoS * 1_000_000)
        val arquivo = File(pasta, "${chave}_${tempoUs}_$largura.jpg")
        if (arquivo.exists()) return@map "file://${arquivo.absolutePath}"
        try {
          val imagem = quadroEm(retriever, tempoUs, largura) ?: return@map null
          FileOutputStream(arquivo).use { imagem.compress(Bitmap.CompressFormat.JPEG, QUALIDADE_JPEG, it) }
          imagem.recycle()
          "file://${arquivo.absolutePath}"
        } catch (_: Exception) {
          null
        }
      }
    }
  }

  private fun quadroEm(retriever: MediaMetadataRetriever, tempoUs: Long, largura: Int): Bitmap? {
    val opcao = MediaMetadataRetriever.OPTION_CLOSEST
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      return retriever.getScaledFrameAtTime(tempoUs, opcao, largura, largura * 2)
    }
    val cheia = retriever.getFrameAtTime(tempoUs, opcao) ?: return null
    val altura = (cheia.height * largura.toDouble() / cheia.width).toInt().coerceAtLeast(1)
    val reduzida = Bitmap.createScaledBitmap(cheia, largura, altura, true)
    if (reduzida !== cheia) cheia.recycle()
    return reduzida
  }

  private companion object {
    const val PASTA_MINIATURAS = "miniaturas-quadros"
    const val QUALIDADE_JPEG = 70
  }

  private fun lerDados(uri: Uri): Map<String, Any?> {
    var captura: Double? = null
    var quadros: Int? = null
    val retriever = MediaMetadataRetriever()
    try {
      retriever.setDataSource(contexto, uri)
      captura = retriever
        .extractMetadata(MediaMetadataRetriever.METADATA_KEY_CAPTURE_FRAMERATE)
        ?.toDoubleOrNull()
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        quadros = retriever
          .extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_FRAME_COUNT)
          ?.toIntOrNull()
      }
    } catch (_: Exception) {
    } finally {
      retriever.release()
    }

    var duracaoUs: Long? = null
    var taxaDaFaixa: Double? = null
    val extrator = MediaExtractor()
    try {
      extrator.setDataSource(contexto, uri, null)
      for (i in 0 until extrator.trackCount) {
        val formato = extrator.getTrackFormat(i)
        if (formato.getString(MediaFormat.KEY_MIME)?.startsWith("video/") != true) continue
        if (formato.containsKey(MediaFormat.KEY_DURATION)) {
          duracaoUs = formato.getLong(MediaFormat.KEY_DURATION)
        }
        if (formato.containsKey(MediaFormat.KEY_FRAME_RATE)) {
          taxaDaFaixa = try {
            formato.getInteger(MediaFormat.KEY_FRAME_RATE).toDouble()
          } catch (_: ClassCastException) {
            formato.getFloat(MediaFormat.KEY_FRAME_RATE).toDouble()
          }
        }
        break
      }
    } catch (_: Exception) {
    } finally {
      extrator.release()
    }

    return mapOf(
      "taxaDeCaptura" to captura,
      "quadros" to quadros,
      "duracaoS" to duracaoUs?.let { it / 1_000_000.0 },
      "taxaDaFaixa" to taxaDaFaixa,
    )
  }
}
