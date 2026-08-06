const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  QRCodeReader,
  RGBLuminanceSource,
} = require("@zxing/library");

const TAMANO_MAXIMO_BYTES = 10 * 1024 * 1024;
const PIXELES_MAXIMOS = 40_000_000;
const TIPOS_PERMITIDOS = new Set(["image/jpeg", "image/png", "image/webp"]);
const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const FIRMA_JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const FIRMA_RIFF = Buffer.from("RIFF");
const FIRMA_WEBP = Buffer.from("WEBP");

function formatoPorFirma(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= FIRMA_JPEG.length && buffer.subarray(0, FIRMA_JPEG.length).equals(FIRMA_JPEG)) return "jpeg";
  if (buffer.length >= FIRMA_PNG.length && buffer.subarray(0, FIRMA_PNG.length).equals(FIRMA_PNG)) return "png";
  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).equals(FIRMA_RIFF)
    && buffer.subarray(8, 12).equals(FIRMA_WEBP)
  ) return "webp";
  return null;
}

function formatoCoincideConMime(formato, mimetype) {
  return (formato === "jpeg" && mimetype === "image/jpeg")
    || (formato === "png" && mimetype === "image/png")
    || (formato === "webp" && mimetype === "image/webp");
}

async function obtenerPixelesNormalizados(buffer, maximo) {
  const { data, info } = await sharp(buffer, { failOn: "error", limitInputPixels: PIXELES_MAXIMOS })
    .rotate()
    .resize({
      width: maximo,
      height: maximo,
      fit: "inside",
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3,
    })
    .toColourspace("srgb")
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (!info.width || !info.height || info.channels !== 3 || data.length !== info.width * info.height * info.channels) {
    throw new Error("La imagen no produjo píxeles RGB válidos.");
  }

  const pixeles = new Int32Array(info.width * info.height);
  for (let indice = 0, origen = 0; indice < pixeles.length; indice += 1, origen += 3) {
    pixeles[indice] = (data[origen] << 16) | (data[origen + 1] << 8) | data[origen + 2];
  }

  return { pixeles, width: info.width, height: info.height };
}

function intentarDecodificar({ pixeles, width, height }) {
  const hints = new Map([
    [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  const fuente = new RGBLuminanceSource(pixeles, width, height);
  const bitmap = new BinaryBitmap(new HybridBinarizer(fuente));
  return new QRCodeReader().decode(bitmap, hints).getText();
}

function esErrorSinQr(error) {
  return ["NotFoundException", "ChecksumException", "FormatException"].includes(error?.name);
}

async function decodificarQr(buffer) {
  const escalas = [2000, 1400];
  let imagenCompleta;

  for (const maximo of escalas) {
    const imagen = await obtenerPixelesNormalizados(buffer, maximo);
    if (!imagenCompleta) imagenCompleta = imagen;

    try {
      return intentarDecodificar(imagen);
    } catch (error) {
      if (!esErrorSinQr(error)) throw error;
    }
  }

  const ladoRecorte = Math.floor(Math.min(imagenCompleta.width, imagenCompleta.height) * 0.7);
  if (ladoRecorte > 0) {
    const fuente = new RGBLuminanceSource(imagenCompleta.pixeles, imagenCompleta.width, imagenCompleta.height);
    const izquierda = Math.floor((imagenCompleta.width - ladoRecorte) / 2);
    const arriba = Math.floor((imagenCompleta.height - ladoRecorte) / 2);

    try {
      const hints = new Map([
        [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
        [DecodeHintType.TRY_HARDER, true],
      ]);
      const bitmap = new BinaryBitmap(new HybridBinarizer(fuente.crop(izquierda, arriba, ladoRecorte, ladoRecorte)));
      return new QRCodeReader().decode(bitmap, hints).getText();
    } catch (error) {
      if (!esErrorSinQr(error)) throw error;
    }
  }

  return null;
}

function crearRouterEquiposQrDecode({ verificarToken }) {
  const router = express.Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: TAMANO_MAXIMO_BYTES, files: 1 },
    fileFilter: (_req, archivo, callback) => {
      if (!TIPOS_PERMITIDOS.has(archivo.mimetype)) {
        const error = new Error("Tipo de imagen no permitido");
        error.code = "TIPO_IMAGEN_NO_PERMITIDO";
        return callback(error);
      }

      return callback(null, true);
    },
  });

  const procesarImagen = (req, res, next) => {
    upload.single("image")(req, res, (error) => {
      if (!error) return next();
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "No fue posible procesar la imagen seleccionada." });
      }
      if (error.code === "TIPO_IMAGEN_NO_PERMITIDO") {
        return res.status(400).json({ message: "No fue posible procesar la imagen seleccionada." });
      }
      return next(error);
    });
  };

  router.post("/decode-image", verificarToken, procesarImagen, async (req, res) => {
    if (!req.file || !Buffer.isBuffer(req.file.buffer) || req.file.buffer.length === 0) {
      return res.status(400).json({ message: "No fue posible procesar la imagen seleccionada." });
    }

    const formatoFirma = formatoPorFirma(req.file.buffer);
    if (!formatoFirma || !formatoCoincideConMime(formatoFirma, req.file.mimetype)) {
      return res.status(400).json({ message: "No fue posible procesar la imagen seleccionada." });
    }

    try {
      const metadata = await sharp(req.file.buffer, { failOn: "error", limitInputPixels: PIXELES_MAXIMOS }).metadata();
      if (!metadata.width || !metadata.height || metadata.format !== formatoFirma) {
        return res.status(400).json({ message: "No fue posible procesar la imagen seleccionada." });
      }

      const decodedText = await decodificarQr(req.file.buffer);
      if (!decodedText) {
        return res.status(400).json({ message: "No se detectó un código QR en la imagen." });
      }

      res.set("Cache-Control", "no-store");
      return res.json({ decodedText });
    } catch (error) {
      if (esErrorSinQr(error)) {
        return res.status(400).json({ message: "No se detectó un código QR en la imagen." });
      }

      if (/unsupported image format|input buffer|image|pixel/i.test(error.message || "")) {
        return res.status(400).json({ message: "No fue posible procesar la imagen seleccionada." });
      }

      console.error("Error al decodificar QR desde imagen:", error);
      return res.status(500).json({ message: "No fue posible procesar la imagen seleccionada." });
    }
  });

  return router;
}

module.exports = crearRouterEquiposQrDecode;
