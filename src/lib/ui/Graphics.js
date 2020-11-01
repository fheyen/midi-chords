import { getBoxplotCharacteristics, kernelEpanechnikov, kernelDensityEstimator } from "../utils/StatisticsUtils";
import { curveMonotoneX, curveLinear, line } from "d3-shape";
import { scaleLinear } from "d3-scale";
import { extent, max } from "d3-array";


/**
 * Sets up a canvas rescaled to device pixel ratio
 * From https://www.html5rocks.com/en/tutorials/canvas/hidpi/
 * @param {HTMLCanvasElement} canvas canvas element
 * @returns {CanvasRenderingContext2D} canvas rendering context
 */
export function setupCanvas(canvas) {
    // Get the device pixel ratio, falling back to 1.
    var dpr = window.devicePixelRatio || 1;
    // Get the size of the canvas in CSS pixels.
    var rect = canvas.getBoundingClientRect();
    // Give the canvas pixel dimensions of their CSS
    // Size times the device pixel ratio.
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    var ctx = canvas.getContext('2d');
    // Scale all drawing operations by the dpr, so you
    // don't have to worry about the difference.
    ctx.scale(dpr, dpr);
    return ctx;
}


/**
 * Draws horizontal bands with alternating color to better distinguish rows.
 * @param {CanvasRenderingContext2D} ctx canvas rendering context
 * @param {number} rowHeight height of bnote boxes
 */
export function drawRowBands(ctx, margin, rows, rowHeight, width, fillStyle = 'rgba(128, 128, 128, 0.1)') {
    const oldFill = ctx.fillStyle;
    ctx.fillStyle = fillStyle;
    const xPos = margin.left;
    for (let i = 0; i < rows; i += 2) {
        const yPos = margin.top + rowHeight * i;
        ctx.fillRect(xPos, yPos, width, rowHeight);
    }
    ctx.fillStyle = oldFill;
}

/**
 * Draws a bar chart.
 * @param {CanvasRenderingContext2D} ctx canvas context
 * @param {number} x x position
 * @param {number} y y position
 * @param {number} width width
 * @param {number} height height
 * @param {number} maxVal maximum value towards the chart values are scaled
 * @param {number[]} values values to draw bars for
 * @param {string[]} colors color for each value entry
 */
export function drawBarChart(ctx, x, y, width, height, maxVal, values, colors) {
    const w = width / values.length;
    for (let i = 0; i < values.length; i++) {
        const value = values[i];
        ctx.fillStyle = colors[i];
        const h = (value / maxVal) * height;
        const yPos = y + height - h;
        ctx.fillRect(x + i * w, yPos, w - 2, h);
    }
}

/**
 * Draws a stacked bar chart.
 * @param {CanvasRenderingContext2D} ctx canvas context
 * @param {number} x x position
 * @param {number} y y position
 * @param {number} width width
 * @param {number} height height
 * @param {number} maxVal maximum value towards the chart values are scaled
 * @param {number[]} values values to draw bars for
 * @param {string[]} colors color for each value entry
 */
export function drawStackedBarChart(ctx, x, y, width, height, maxVal, values, colors) {
    let currentSum = 0;
    // Stack values
    for (let i = values.length - 1; i >= 0; i--) {
        currentSum += values[i];
        values[i] = currentSum;
    }
    for (let i = 0; i < values.length; i++) {
        const val = values[i];
        ctx.fillStyle = colors[i];
        const h = (val / maxVal) * height;
        const yPos = y + height - h;
        ctx.fillRect(x, yPos, width, h);
    }
}

/**
 * Draws a horizontal boxplot onto a canvas.
 * @param {CanvasRenderingContext2D} ctx canvas rendering context
 * @param {Object} margin width {top, right, left, bottom}
 * @param {Function} x D3 linear scale
 * @param {number} yPos y position
 * @param {number} plotHeight height of the plot
 * @param {number[]} data array of numbers to draw the boxplot for
 * @param {boolean} drawOutliers if true, outliers will be drawn as dots
 * @param {string} fillBox color for the box
 * @param {string} fillWhisk color for the whiskers
 */
export function drawBoxplot(
    ctx,
    margin,
    x,
    yPos,
    plotHeight,
    data,
    drawOutliers = false,
    fillBox = 'rgba(70, 130, 180, 0.8)',
    fillWhisk = 'steelblue'
) {
    const { q1, q2, q3, r0, r1 } = getBoxplotCharacteristics(data);
    // Get positions
    const q1Pos = margin.left + x(q1);
    const q2Pos = margin.left + x(q2);
    const q3Pos = margin.left + x(q3);
    const r0Pos = margin.left + x(r0);
    const r1Pos = margin.left + x(r1);
    const yCenter = yPos + plotHeight / 2;
    // Box (with a gap for the median)
    ctx.fillStyle = fillBox;
    ctx.fillRect(q1Pos, yPos, q2Pos - q1Pos - 1, plotHeight);
    ctx.fillRect(q2Pos + 1, yPos, q3Pos - q2Pos - 1, plotHeight);
    ctx.fillStyle = fillWhisk;
    // Left whisker
    ctx.fillRect(r0Pos, yPos, 1, plotHeight);
    ctx.fillRect(r0Pos, yCenter, q1Pos - r0Pos, 1);
    // Right whisker
    ctx.fillRect(r1Pos, yPos, 1, plotHeight);
    ctx.fillRect(q3Pos, yCenter, r1Pos - q3Pos, 1);
    // Draw outliers
    if (drawOutliers) {
        const outliers = data.filter(d => d < r0 || d > r1);
        for (let ol of outliers) {
            ctx.fillRect(margin.left + x(ol), yCenter, 2, 2);
        }
    }
}

/**
 * Draws a kernel density estimation (KDE) area chart for each pitch.
 * TODO: draw mean and quartiles like in a box plot
 * @param {CanvasRenderingContext2D} ctx canvas rendering context
 * @param {Object} margin width {top, right, left, bottom}
 * @param {Function} x D3 linear scale
 * @param {number} yPos y position
 * @param {number} plotHeight height of the plot
 * @param {number[]} data array of numbers to draw the boxplot for
 * @param {boolean} smooth turn smoothing on and off
 * @param {string} fillStyle fill color
 * @param {number} bandwidth kernel bandwidth
 * @param {number} ticks number of ticks for which to compute a curve point
 */
export function drawKdeAreaChart(ctx, margin, x, yPos, plotHeight, data, smooth = true, fillStyle, bandwidth = 0.5, ticks = 100) {
    const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), x.ticks(ticks));
    const estimate = kde(data);
    // Force 0 for y value at start and end for correct drawing
    estimate.unshift([estimate[0][0], 0]);
    estimate.push([estimate[estimate.length - 1][0], 0]);
    const y = scaleLinear()
        .domain(extent(estimate, d => d[1]))
        .range([yPos + plotHeight, yPos]);
    // Smoothed or linearly interpolated area
    const lineGenerator = line()
        .x(d => margin.left + x(d[0]))
        .y(d => y(d[1]))
        .curve(smooth ? curveMonotoneX : curveLinear)
        .context(ctx);
    ctx.beginPath();
    lineGenerator(estimate);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
}

/**
 * Draws a violinplot (a mirrored KDE area chart).
 * TODO: draw mean and quartiles like in a box plot
 * @param {CanvasRenderingContext2D} ctx canvas rendering context
 * @param {Object} margin width {top, right, left, bottom}
 * @param {Function} x D3 linear scale
 * @param {number} yPos y position
 * @param {number} plotHeight height of the plot
 * @param {number[]} data array of numbers to draw the boxplot for
 * @param {boolean} smooth turn smoothing on and off
 * @param {string} fillStyle fill color
 * @param {number} bandwidth kernel bandwidth
 * @param {number} ticks number of ticks for which to compute a curve point
 */
export function drawViolinPlot(ctx, margin, x, yPos, plotHeight, data, smooth = true, fillStyle, bandwidth = 0.5, ticks = 100) {
    const kde = kernelDensityEstimator(kernelEpanechnikov(bandwidth), x.ticks(ticks));
    const estimate = kde(data);
    // Force 0 for y value at start and end for correct drawing
    estimate.unshift([estimate[0][0], 0]);
    estimate.push([estimate[estimate.length - 1][0], 0]);
    const maxEst = max(estimate, d => d[1]);
    const y = scaleLinear()
        .domain([-maxEst, maxEst])
        .range([yPos + plotHeight, yPos]);
    // Smoothed or linearly interpolated area
    const lineGeneratorTop = line()
        .x(d => margin.left + x(d[0]))
        .y(d => y(d[1]))
        .curve(smooth ? curveMonotoneX : curveLinear)
        .context(ctx);
    const lineGeneratorBottom = line()
        .x(d => margin.left + x(d[0]))
        .y(d => y(-d[1]))
        .curve(smooth ? curveMonotoneX : curveLinear)
        .context(ctx);
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    lineGeneratorTop(estimate);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    lineGeneratorBottom(estimate);
    ctx.closePath();
    ctx.fill();
}


/**
  * Draws a drum note shape to the canvas.
  * @param {CanvasRenderingContext2D} ctx canvas context
  * @param {string} shape one of [triangle, <>, x, o, ostroke, xstroke]
  * @param {number} x x position
  * @param {number} y y position
  * @param {number} size size (width and height of the symbols outer bounds)
  */
export function drawDrumNoteShape(ctx, shape, x, y, size) {
    const halfSize = size * 0.4;
    switch (shape) {
        case 'triangle':
            drawTriangle(ctx, x, y, halfSize);
            break;
        case '<>':
            drawDiamond(ctx, x, y, halfSize);
            break;
        case 'x':
            drawX(ctx, x, y, halfSize);
            break;
        case 'o':
            drawFilledCircle(ctx, x, y, halfSize);
            break;
        case 'ostroke':
            drawFilledCircle(ctx, x, y, halfSize);
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - halfSize, y - halfSize);
            ctx.lineTo(x + halfSize, y + halfSize);
            ctx.stroke();
            ctx.lineWidth = 1;
            break;
        case 'xstroke':
            drawX(ctx, x, y, halfSize);
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x - halfSize, y);
            ctx.lineTo(x + halfSize, y);
            ctx.stroke();
            ctx.lineWidth = 1;
            break;
        default:
            console.warn(`Unsupported shape ${shape}`);
    }
}

/**
 * Draws a stroked circle.
 * @param {CanvasRenderingContext2D} ctx canvas rendering context
 * @param {number} x x coordinate of center
 * @param {number} y y coordinate of center
 * @param {number} radius radius
 */
export function drawCircle(ctx, x, y, radius) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.stroke();
}

/**
 * Draws a filled circle.
 * @param {CanvasRenderingContext2D} ctx canvas rendering context
 * @param {number} x x coordinate of center
 * @param {number} y y coordinate of center
 * @param {number} radius radius
 */
export function drawFilledCircle(ctx, x, y, radius) {
    if (radius < 0) {
        console.error(`Cannot draw circle with negative radius of ${radius}`);
    }
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
}

/**
 * Draws a filled triangle like this: /\
 * @param {CanvasRenderingContext2D} ctx canvas rendering context
 * @param {number} x x coordinate of center
 * @param {number} y y coordinate of center
 * @param {number} halfSize half of the size
 */
export function drawTriangle(ctx, x, y, halfSize) {
    ctx.beginPath();
    ctx.moveTo(x - halfSize, y + halfSize);
    ctx.lineTo(x + halfSize, y + halfSize);
    ctx.lineTo(x, y - halfSize);
    ctx.closePath();
    ctx.fill();
}

/**
 * Draws a diamond like this: <>
 * @param {CanvasRenderingContext2D} ctx canvas rendering context
 * @param {number} x x coordinate of center
 * @param {number} y y coordinate of center
 * @param {number} halfSize half of the size
 */
export function drawDiamond(ctx, x, y, halfSize) {
    ctx.beginPath();
    ctx.moveTo(x - halfSize, y);
    ctx.lineTo(x, y - halfSize);
    ctx.lineTo(x + halfSize, y);
    ctx.lineTo(x, y + halfSize);
    ctx.closePath();
    ctx.fill();
}

/**
 * Draws an X
 * @param {CanvasRenderingContext2D} ctx canvas rendering context
 * @param {number} x x coordinate of center
 * @param {number} y y coordinate of center
 * @param {number} halfSize half of the size
 */
export function drawX(ctx, x, y, halfSize) {
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - halfSize, y - halfSize);
    ctx.lineTo(x + halfSize, y + halfSize);
    ctx.moveTo(x - halfSize, y + halfSize);
    ctx.lineTo(x + halfSize, y - halfSize);
    ctx.stroke();
    ctx.lineWidth = 1;
}

/**
 * Draws a trapezoid that looks like a rectangle but gets narrower at the right
 * end, so better show where one ends and the next begins.
 * @param {CanvasRenderingContext2D} ctx canvas rendering context
 * @param {number} x x coordinate of top left
 * @param {number} y y coordinate of top left
 * @param {number} width width
 * @param {number} height height (of left side)
 * @param {number} height2 height (of right side)
 */
export function drawNoteTrapezoid(ctx, x, y, width, height, height2) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + width, y + (height / 2 + height2 / 2));
    ctx.lineTo(x + width, y + (height / 2 - height2 / 2));
    ctx.closePath();
    ctx.fill();
}

/**
 * Draws a trapezoid that looks like a rectangle but gets narrower at the top
 * end, so better show where one ends and the next begins.
 * @param {CanvasRenderingContext2D} ctx canvas rendering context
 * @param {number} x x coordinate of bounding rect's top left
 * @param {number} y y coordinate of bounding rect's top left
 * @param {number} width width (of bounding rect / bottom side)
 * @param {number} height height
 * @param {number} width2 width (of top side)
 */
export function drawNoteTrapezoidUpwards(ctx, x, y, width, height, width2) {
    ctx.beginPath();
    ctx.lineTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x + (width / 2 + width2 / 2), y);
    ctx.lineTo(x + (width / 2 - width2 / 2), y);
    ctx.closePath();
    ctx.fill();
}

/**
 * Draws an arc that connects similar parts.
 * Both parts must have the same width in pixels.
 * @param {CanvasRenderingContext2D} ctx canvas rendering context
 * @param {number} startX1 x coordinate of the start of the first part
 * @param {number} startX2 x coordinate of the start of the second part
 * @param {number} length length in pixels of the parts
 * @param {number} yBottom bottom baseline y coordinate
 */
export function drawArc(ctx, startX1, startX2, length, yBottom) {
    // Get center and radius
    const radius = (startX2 - startX1) / 2;
    const cx = startX1 + radius + length / 2;
    ctx.lineWidth = length;
    ctx.beginPath();
    ctx.arc(cx, yBottom, radius, Math.PI, 2 * Math.PI);
    ctx.stroke();
}

/**
 * Draws a more complex path and fills it.
 * Two arcs: One from startX1 to endX2 on the top, one from endX1 to startX2
 * below it.
 * @param {CanvasRenderingContext2D} ctx canvas rendering context
 * @param {number} startX1 x coordinate of the start of the first part
 * @param {number} endX1 x coordinate of the end of the first part
 * @param {number} startX2 x coordinate of the start of the second part
 * @param {number} endX2 x coordinate of the end of the second part
 * @param {number} endX2 x coordinate of the end of the second part
 * @param {number} yBottom bottom baseline y coordinate
 */
export function drawAssymetricArc(ctx, startX1, endX1, startX2, endX2, yBottom) {
    // Get center and radius
    const radiusTop = (endX2 - startX1) / 2;
    if (radiusTop < 0) {
        return;
    }
    let radiusBottom = (startX2 - endX1) / 2;
    if (radiusBottom < 0) {
        radiusBottom = 0;
    }
    const cxTop = startX1 + radiusTop;
    const cxBottom = endX1 + radiusBottom;
    ctx.beginPath();
    ctx.moveTo(startX1, yBottom);
    ctx.arc(cxTop, yBottom, radiusTop, Math.PI, 2 * Math.PI);
    ctx.lineTo(startX2, yBottom);
    ctx.arc(cxBottom, yBottom, radiusBottom, 2 * Math.PI, Math.PI, true);
    ctx.closePath();
    ctx.fill();
}

/**
 * Draws a line indicating the current player time
 * @param {number} currentPlayerTime current player time in seconds
 * @param {Function} x D3 scaleLinear for x axis
 */
export function drawCurrentTimeIndicator(ctx, currentPlayerTime, x, height, margin) {
    if (currentPlayerTime === null) {
        return;
    }
    const xPos = margin.left + x(currentPlayerTime) - 1;
    ctx.fillRect(xPos, margin.top, 2, height);
}

/**
 * Clips left and right of a visualization by clearing parts of the canvas.
 * @param {CanvasRenderingContext2D} ctx canvas rendering context
 * @param {Object} margin {top, right, bottom, left}
 * @param {number} width width of the area to clip around
 * @param {number} height height of the clipping area
 */
export function clipLeftRight(ctx, margin, width, height) {
    ctx.clearRect(0, margin.top, margin.left, height);
    ctx.clearRect(margin.left + width, margin.top, margin.right, height);
}

/**
 * Draws measure lines and tempo and beat type information
 * @param {CanvasRenderingContext2D} ctx canvas rendering context
 * @param {Object} parsedXml parsed MusicXML data
 * @param {Object} margin {top, right, bottom, left}
 * @param {number} width width
 * @param {number} height height
 * @param {Function} x D3 linear scale
 */
export function drawMusicXmlInformation(ctx, parsedXml, margin, width, height, x) {
    // Draw measure lines
    ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
    for (let i = 0; i < parsedXml.measureLinePositions.length; i++) {
        const line = parsedXml.measureLinePositions[i];
        const xPos = x(line);
        // Do not draw invisible lines
        if (xPos < 0) { continue; }
        if (xPos > width) { break; }
        const pos = margin.left + xPos;
        ctx.fillRect(pos, margin.top, 2, height);
        // Draw measure number
        if ((i + 2) % 4 === 0) {
            ctx.fillStyle = '#888';
            ctx.fillText(i + 2, pos + 10, margin.top);
            ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
        }
    }
    const xOffs = margin.left + 15;
    ctx.fillStyle = '#888';
    // Draw tempo changes
    for (let t of parsedXml.tempoChanges) {
        ctx.fillText(`${t.tempo} bpm`, xOffs + x(t.time), margin.top - 20);
    }
    // Draw beatType changes
    for (let b of parsedXml.beatTypeChanges) {
        ctx.fillText(`${b.beats} / ${b.beatType}`, xOffs + x(b.time), margin.top - 8);
    }
}
