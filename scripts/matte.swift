// Foreground matting via the system Vision framework — the same engine
// behind Preview's "Remove Background". Produces a full-res RGBA PNG
// with soft alpha (handles hair), no downloads, no external deps.
//
//   swift scripts/matte.swift <input.jpg> <output.png>
//
// Called by scripts/cutout.ts, which handles trim/resize/webp.
import CoreImage
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count == 3 else {
  FileHandle.standardError.write(Data("usage: matte <input> <output.png>\n".utf8))
  exit(1)
}
let input = URL(fileURLWithPath: args[1])
let output = URL(fileURLWithPath: args[2])

do {
  let handler = VNImageRequestHandler(url: input)
  let request = VNGenerateForegroundInstanceMaskRequest()
  try handler.perform([request])

  guard let result = request.results?.first else {
    FileHandle.standardError.write(Data("no foreground detected in \(args[1])\n".utf8))
    exit(2)
  }

  let buffer = try result.generateMaskedImage(
    ofInstances: result.allInstances,
    from: handler,
    croppedToInstancesExtent: false
  )

  let image = CIImage(cvPixelBuffer: buffer)
  let context = CIContext()
  guard let srgb = CGColorSpace(name: CGColorSpace.sRGB),
    let png = context.pngRepresentation(of: image, format: .RGBA8, colorSpace: srgb)
  else {
    FileHandle.standardError.write(Data("png encode failed\n".utf8))
    exit(3)
  }
  try png.write(to: output)
} catch {
  FileHandle.standardError.write(Data("matte failed: \(error)\n".utf8))
  exit(4)
}
