import Foundation
import Darwin
import Vision

guard CommandLine.arguments.count == 3 else {
  fputs("Usage: verify-ios-screenshot.swift <image> <expected text>\n", stderr)
  exit(2)
}

let imageURL = URL(fileURLWithPath: CommandLine.arguments[1])
let expected = CommandLine.arguments[2]
  .lowercased()
  .replacingOccurrences(of: "[^a-z0-9]+", with: " ", options: .regularExpression)
  .trimmingCharacters(in: .whitespacesAndNewlines)

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
try VNImageRequestHandler(url: imageURL).perform([request])

let recognized = (request.results ?? [])
  .compactMap { $0.topCandidates(1).first?.string }
  .joined(separator: " ")
  .lowercased()
  .replacingOccurrences(of: "[^a-z0-9]+", with: " ", options: .regularExpression)

guard recognized.contains(expected) else {
  exit(1)
}

print("Verified screenshot content: \(CommandLine.arguments[2])")
