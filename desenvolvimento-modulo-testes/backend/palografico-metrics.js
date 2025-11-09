const { performance } = require('perf_hooks');
const sharp = require('sharp');

let imageJsModule = null;

async function getImageJs() {
  if (!imageJsModule) {
    const imported = await import('image-js');
    const moduleRef =
      imported && imported.default && Object.keys(imported.default).length
        ? imported.default
        : imported;
    const { Image } = moduleRef;
    if (!Image) {
      throw new Error('Biblioteca image-js não expôs o construtor Image');
    }
    imageJsModule = { Image };
  }
  return imageJsModule;
}

const mmScaleReference = {
  widthMm: 215,
  heightMm: 320
};

function chunkArrayForTempos(items, tempoCount = 5) {
  if (items.length === 0) {
    return Array.from({ length: tempoCount }, () => []);
  }

  const groups = [];
  let index = 0;
  let remainder = items.length % tempoCount;
  const base = Math.floor(items.length / tempoCount);

  for (let tempo = 0; tempo < tempoCount; tempo += 1) {
    const size = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
    const slice = items.slice(index, index + size);
    groups.push(slice);
    index += size;
  }

  if (index < items.length) {
    const lastGroup = groups[groups.length - 1] || [];
    groups[groups.length - 1] = lastGroup.concat(items.slice(index));
  }

  return groups;
}

function toFixed(number, precision = 2) {
  if (!Number.isFinite(number)) return null;
  return parseFloat(number.toFixed(precision));
}

function variance(values) {
  if (!values || values.length === 0) return 0;
  const mean = values.reduce((acc, val) => acc + val, 0) / values.length;
  const sumSquares = values.reduce((acc, val) => acc + (val - mean) ** 2, 0);
  return sumSquares / values.length;
}

function stdDev(values) {
  return Math.sqrt(variance(values));
}

function average(values) {
  if (!values || values.length === 0) return null;
  const total = values.reduce((acc, value) => acc + value, 0);
  return total / values.length;
}

function median(values) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function calculateLinearRegression(points) {
  if (!points || points.length < 2) {
    return { slope: 0, angleDeg: 0 };
  }

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, angleDeg: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const angleRad = Math.atan(slope);
  const angleDeg = angleRad * (180 / Math.PI);

  return { slope, angleDeg };
}

async function loadBinaryImage(imagePath) {
  const { Image } = await getImageJs();
  const image = await Image.load(imagePath);
  const grey = image.grey({ algorithm: 'luma' });
  const binary = grey.threshold({ algorithm: 'otsu' });

  const metadata = await sharp(imagePath).metadata();
  const width = binary.width;
  const height = binary.height;
  const pxPerMMX = width / mmScaleReference.widthMm;
  const pxPerMMY = height / mmScaleReference.heightMm;

  return {
    binary,
    width,
    height,
    pxPerMMX,
    pxPerMMY,
    metadata
  };
}

function segmentLines(binary, width, height) {
  const data = binary.data;
  const channels = binary.components ?? binary.channels ?? 1;
  const horizontalProjection = new Array(height).fill(0);

  for (let y = 0; y < height; y += 1) {
    let count = 0;
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * channels;
      const value = data[idx];
      if (value < 128) count += 1;
    }
    horizontalProjection[y] = count / width;
  }

  const thresholdRatio = 0.01;
  const minHeight = Math.max(5, Math.floor(height * 0.01));
  const lines = [];
  let isInside = false;
  let startY = 0;

  for (let y = 0; y < height; y += 1) {
    if (horizontalProjection[y] > thresholdRatio) {
      if (!isInside) {
        startY = y;
        isInside = true;
      }
    } else if (isInside) {
      const endY = y - 1;
      if (endY - startY + 1 >= minHeight) {
        lines.push({ startY, endY });
      }
      isInside = false;
    }
  }

  if (isInside) {
    const endY = height - 1;
    if (endY - startY + 1 >= minHeight) {
      lines.push({ startY, endY });
    }
  }

  return lines;
}

function analyzeLine(binary, width, startY, endY, pxPerMMX, pxPerMMY) {
  const data = binary.data;
  const channels = binary.components ?? binary.channels ?? 1;
  const lineHeight = endY - startY + 1;
  const columnProjection = new Array(width).fill(0);

  let marginLeft = width;
  let marginRight = -1;
  let firstPaloTop = null;
  let lastPaloTop = null;

  for (let x = 0; x < width; x += 1) {
    let count = 0;
    for (let y = startY; y <= endY; y += 1) {
      const idx = (y * width + x) * channels;
      const value = data[idx];
      if (value < 128) {
        count += 1;
        if (x < marginLeft) marginLeft = x;
        if (x > marginRight) marginRight = x;
        if (!firstPaloTop || y < firstPaloTop.y) {
          firstPaloTop = { x, y };
        }
        if (!lastPaloTop || y < lastPaloTop.y || (y === lastPaloTop.y && x > lastPaloTop.x)) {
          lastPaloTop = { x, y };
        }
      }
    }
    columnProjection[x] = count;
  }

  const minRunHeight = Math.max(3, Math.floor(lineHeight * 0.2));
  const palos = [];
  let insideRun = false;
  let runStart = 0;

  for (let x = 0; x < width; x += 1) {
    if (columnProjection[x] >= minRunHeight) {
      if (!insideRun) {
        runStart = x;
        insideRun = true;
      }
    } else if (insideRun) {
      const runEnd = x - 1;
      const palo = computePaloMetrics(binary, width, startY, endY, runStart, runEnd, pxPerMMX, pxPerMMY);
      if (palo) {
        palos.push(palo);
      }
      insideRun = false;
    }
  }

  if (insideRun) {
    const runEnd = width - 1;
    const palo = computePaloMetrics(binary, width, startY, endY, runStart, runEnd, pxPerMMX, pxPerMMY);
    if (palo) palos.push(palo);
  }

  const marginLeftMM = marginLeft === width ? null : marginLeft / pxPerMMX;
  const marginRightMM = marginRight === -1 ? null : (width - marginRight - 1) / pxPerMMX;

  const directionAngle = computeLineDirection(binary, width, startY, endY);

  return {
    startY,
    endY,
    marginLeftMM,
    marginRightMM,
    palos,
    directionAngle,
    firstPaloTop,
    lastPaloTop
  };
}

function computePaloMetrics(binary, width, startY, endY, runStart, runEnd, pxPerMMX, pxPerMMY) {
  const data = binary.data;
  const channels = binary.components ?? binary.channels ?? 1;
  let minY = Infinity;
  let maxY = -Infinity;
  let topX = runStart;
  let bottomX = runStart;
  let widthPx = runEnd - runStart + 1;

  for (let x = runStart; x <= runEnd; x += 1) {
    for (let y = startY; y <= endY; y += 1) {
      const idx = (y * width + x) * channels;
      const value = data[idx];
      if (value < 128) {
        if (y < minY) {
          minY = y;
          topX = x;
        }
        if (y > maxY) {
          maxY = y;
          bottomX = x;
        }
      }
    }
  }

  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
    return null;
  }

  const heightPx = maxY - minY + 1;
  const heightMM = heightPx / pxPerMMY;
  const inclinationPx = bottomX - topX;
  const inclinationMM = inclinationPx / pxPerMMX;

  let hookScore = 0;
  const hookTolerance = Math.max(1, Math.round(pxPerMMX * 1.2));
  if (widthPx > hookTolerance) {
    hookScore += 1;
  }
  if (Math.abs(inclinationPx) > hookTolerance) {
    hookScore += 1;
  }

  return {
    runStart,
    runEnd,
    heightPx,
    heightMM,
    inclinationPx,
    inclinationMM,
    hookScore
  };
}

function computeLineDirection(binary, width, startY, endY) {
  const data = binary.data;
  const channels = binary.components ?? binary.channels ?? 1;
  const points = [];
  const sampleStep = Math.max(1, Math.floor((endY - startY + 1) / 12));

  for (let x = 0; x < width; x += 1) {
    let sumY = 0;
    let count = 0;
    for (let y = startY; y <= endY; y += sampleStep) {
      const idx = (y * width + x) * channels;
      const value = data[idx];
      if (value < 128) {
        sumY += y;
        count += 1;
      }
    }
    if (count > 0) {
      points.push({ x, y: sumY / count });
    }
  }

  const { angleDeg } = calculateLinearRegression(points);
  return angleDeg;
}

function buildTempoSummary(lineGroups, pxPerMMX, pxPerMMY) {
  const tempoSummaries = [];

  lineGroups.forEach((lines, index) => {
    const palos = lines.flatMap((line) => line.palos);
    const heights = palos.map((palo) => palo.heightMM);
    const inclinations = palos.map((palo) => Math.abs(palo.inclinationMM));
    const hookScore = palos.reduce((acc, palo) => acc + palo.hookScore, 0);

    tempoSummaries.push({
      tempoIndex: index + 1,
      palos,
      stats: {
        averageHeight: heights.length ? average(heights) : null,
        medianHeight: heights.length ? median(heights) : null,
        maxHeight: heights.length ? Math.max(...heights) : null,
        minHeight: heights.length ? Math.min(...heights) : null,
        averageInclination: inclinations.length ? average(inclinations) : null,
        palosCount: palos.length,
        hookScore
      }
    });
  });

  return tempoSummaries;
}

function computeQualitativeSummary(allHeights, allInclinations, hookRatio) {
  const heightStd = stdDev(allHeights);
  const inclinationStd = stdDev(allInclinations);
  const pressure = allHeights.length ? (heightStd < 1 ? 'Consistente' : 'Variável') : 'Não avaliado';
  const tremores = inclinationStd > 1 ? 'Possíveis irregularidades finas' : 'Ausentes';
  const uniformidade =
    allHeights.length && heightStd / (average(allHeights) || 1) < 0.15 ? 'Alta' : 'Moderada';

  return {
    pressao_visual: pressure,
    tremores_visiveis: tremores,
    uniformidade_tracado_qualit: uniformidade,
    outros_sinais_emocionais:
      hookRatio > 5
        ? 'Indicativos de rigidez ou tensão pelos ganchos acentuados'
        : 'Nenhum sinal marcante identificado'
  };
}

async function analyzePalograficoGeometry(processedImagePath) {
  const start = performance.now();
  const {
    binary,
    width,
    height,
    pxPerMMX,
    pxPerMMY,
    metadata
  } = await loadBinaryImage(processedImagePath);

  const lines = segmentLines(binary, width, height);
  const lineAnalyses = lines.map((line) =>
    analyzeLine(binary, width, line.startY, line.endY, pxPerMMX, pxPerMMY)
  );

  const lineSpacing = [];
  for (let i = 1; i < lineAnalyses.length; i += 1) {
    const previous = lineAnalyses[i - 1];
    const current = lineAnalyses[i];
    const spacing = (current.startY - previous.endY) / pxPerMMY;
    if (spacing > 0) {
      lineSpacing.push(spacing);
    }
  }

  const marginsLeft = lineAnalyses
    .map((line) => line.marginLeftMM)
    .filter((value) => Number.isFinite(value));
  const marginsRight = lineAnalyses
    .map((line) => line.marginRightMM)
    .filter((value) => Number.isFinite(value));

  const tempoGroups = chunkArrayForTempos(lineAnalyses, 5);
  const tempoSummaries = buildTempoSummary(tempoGroups, pxPerMMX, pxPerMMY);

  const palosAll = tempoSummaries.flatMap((tempo) => tempo.palos);
  const heightsAll = palosAll.map((palo) => palo.heightMM);
  const inclinationsAll = palosAll.map((palo) => Math.abs(palo.inclinationMM));
  const totalHooks = palosAll.reduce((acc, palo) => acc + (palo.hookScore > 0 ? 1 : 0), 0);
  const totalPalos = palosAll.length;
  const hookRatio = totalPalos > 0 ? (totalHooks * 100) / totalPalos : 0;

  const firstLine = lineAnalyses[0] || null;
  const marginTopPoint1 = firstLine && firstLine.firstPaloTop ? firstLine.firstPaloTop.y / pxPerMMY : null;
  const marginTopPoint2 = firstLine && firstLine.lastPaloTop ? firstLine.lastPaloTop.y / pxPerMMY : null;
  const marginTopAverage =
    marginTopPoint1 !== null && marginTopPoint2 !== null
      ? (marginTopPoint1 + marginTopPoint2) / 2
      : marginTopPoint1 ?? marginTopPoint2 ?? null;

  const qualitativeSummary = computeQualitativeSummary(heightsAll, inclinationsAll, hookRatio);

  const elapsedMs = performance.now() - start;

  return {
    geometry: {
      width,
      height,
      pxPerMMX,
      pxPerMMY,
      metadata
    },
    lines: lineAnalyses,
    tempoSummaries,
    totals: {
      totalLines: lineAnalyses.length,
      totalPalos,
      totalHooks,
      hookRatio: toFixed(hookRatio, 2),
      analysisTimeMs: Math.round(elapsedMs)
    },
    margins: {
      leftPerLine: marginsLeft,
      rightPerLine: marginsRight,
      leftAverage: marginsLeft.length ? average(marginsLeft) : null,
      rightAverage: marginsRight.length ? average(marginsRight) : null,
      topPoint1: marginTopPoint1,
      topPoint2: marginTopPoint2,
      topAverage: marginTopAverage
    },
    spacing: {
      perGap: lineSpacing,
      average: lineSpacing.length ? average(lineSpacing) : null
    },
    qualitativeSummary
  };
}

module.exports = {
  analyzePalograficoGeometry
};

