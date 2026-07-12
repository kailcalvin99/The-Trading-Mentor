import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_AGGREGATE_CHART_IMAGE_BYTES,
  MAX_CHART_IMAGE_BYTES,
  chartImageDecodedBytes,
  validateChartImages,
} from "../../lib/api-zod/src/chartImages";

function image(bytes: number, mime = "image/webp") {
  const data = Buffer.alloc(bytes, 1);
  if (mime === "image/jpeg") Buffer.from([0xff, 0xd8, 0xff]).copy(data);
  if (mime === "image/png") Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(data);
  if (mime === "image/webp") {
    Buffer.from("RIFF").copy(data, 0);
    Buffer.from("WEBP").copy(data, 8);
  }
  return `data:${mime};base64,${data.toString("base64")}`;
}

test("accepts nullable and supported browser image data URLs", () => {
  assert.equal(validateChartImages({}), null);
  assert.equal(validateChartImages({ higherTimeframeChart: null }), null);
  for (const mime of ["image/jpeg", "image/png", "image/webp"]) {
    assert.equal(validateChartImages({ setupTimeframeChart: image(32, mime) }), null);
  }
});

test("rejects malformed, empty, and unsupported chart images", () => {
  assert.match(validateChartImages({ higherTimeframeChart: "" }) || "", /non-empty/);
  assert.match(validateChartImages({ higherTimeframeChart: "data:image/gif;base64,AAAA" }) || "", /valid JPEG/);
  assert.match(validateChartImages({ higherTimeframeChart: "data:image/png;base64,%%%" }) || "", /valid JPEG/);
  assert.equal(chartImageDecodedBytes("data:image/png;base64,"), null);
});

test("enforces individual and aggregate limits below the API body ceiling", () => {
  assert.match(validateChartImages({ higherTimeframeChart: image(MAX_CHART_IMAGE_BYTES + 1) }) || "", /exceeds/);
  const each = Math.floor(MAX_AGGREGATE_CHART_IMAGE_BYTES / 3) + 1;
  assert.match(validateChartImages({
    higherTimeframeChart: image(each),
    setupTimeframeChart: image(each),
    entryTimeframeChart: image(each),
  }) || "", /combined limit/);
  assert.ok(Math.ceil(MAX_AGGREGATE_CHART_IMAGE_BYTES * 4 / 3) < 2 * 1024 * 1024);
});
