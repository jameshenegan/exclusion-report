const config = {
  svgHeight: 600,
  svgWidth: 800,
  rectHeight: 60,
  rectWidth: 350,
  lineHeight: 10,
  offsetLineY: 10,
  rectFill: "#fff",
  rectStroke: "#000",
  fontSize: 10,
  rectSpacing: 50,
  markerHeight: 10,
  verticalLineOffset: 50,
};

const fetchData = async (url) => {
  const response = await fetch(url);
  const data = await response.text();
  const parsedData = d3.csvParse(data);
  return parsedData.map((d) => {
    d.boxNumber = +d.boxNumber;
    d.lineNumber = +d.lineNumber;
    return d;
  });
};

const createSvg = () => {
  const svg = d3
    .select("#viz")
    .append("svg")
    .attr("height", config.svgHeight)
    .attr("width", config.svgWidth);

  svg
    .append("defs")
    .append("marker")
    .attr("id", "marker")
    .attr("markerWidth", 10)
    .attr("markerHeight", config.markerHeight)
    .attr("refX", 0)
    .attr("refY", 3.5)
    .attr("orient", "auto")
    .append("polygon")
    .attr("points", "0 0, 10 3.5, 0 7");

  return svg;
};

const drawTextLeft = (svg, data, xOffset, coords) => {
  const filteredData = data.reduce((acc, d) => {
    acc[d.boxNumber] = acc[d.boxNumber] || [];
    acc[d.boxNumber].push(d);
    return acc;
  }, []);

  filteredData.forEach((lines, textBoxNumber) => {
    const textBoxYRef = coords.find((d) => d.textBoxNumber === textBoxNumber).y;
    const textBoxY =
      textBoxYRef + (config.rectHeight - lines.length * config.lineHeight) / 2;

    lines.forEach((d, lineNumber) => {
      svg
        .append("text")
        .attr("text-anchor", "middle")
        .attr("font-family", "Arial, Helvetica, sans-serif")
        .attr("font-size", config.fontSize)
        .attr("x", xOffset)
        .attr(
          "y",
          textBoxY + lineNumber * config.lineHeight + config.offsetLineY
        )
        .text(d.lineContent);
    });
  });
};

const drawDownArrow = (svg, x1, y1, x2, y2) => {
  const y2Correction = y2 - config.markerHeight;
  svg
    .append("line")
    .attr("x1", x1)
    .attr("y1", y1)
    .attr("x2", x2)
    .attr("y2", y2Correction)
    .attr("stroke", "black")
    .attr("marker-end", "url(#marker)");
};

const drawRightArrow = (svg, x1, y1, x2, y2) => {
  const x2Correction = x2 - config.markerHeight;
  svg
    .append("line")
    .attr("x1", x1)
    .attr("y1", y1)
    .attr("x2", x2Correction)
    .attr("y2", y2)
    .attr("stroke", "black")
    .attr("marker-end", "url(#marker)");
};

const drawRectanglesLeft = (svg, data, xOffset) => {
  const textBoxes = Array.from(new Set(data.map((d) => d.boxNumber))).length;
  const rectCoords = [];

  for (let i = 0; i < textBoxes; i++) {
    const y =
      ((i + 1) / (textBoxes + 1)) * config.svgHeight - config.rectHeight / 2;
    rectCoords.push({ textBoxNumber: i, y });

    svg
      .append("rect")
      .attr("width", config.rectWidth)
      .attr("height", config.rectHeight)
      .attr("x", xOffset)
      .attr("y", y)
      .attr("fill", config.rectFill)
      .attr("stroke", config.rectStroke);
  }

  return rectCoords;
};

const drawLinesLeft = (coords, xOffset) => {
  const svg = d3.select("svg");

  coords.forEach((coord, index) => {
    if (index < coords.length - 1) {
      const x1 = xOffset + config.rectWidth / 2;
      const y1 = coord.y + config.rectHeight;
      const x2 = xOffset + config.rectWidth / 2;
      const y2 = coords[index + 1].y;
      drawDownArrow(svg, x1, y1, x2, y2);
    }
  });
};

const getMidpointsYCoords = (coords) => {
  const midpointsY = [];

  for (let i = 0; i < coords.length - 1; i++) {
    const y1 = coords[i].y + config.rectHeight;
    const y2 = coords[i + 1].y;
    const midpointY = (y1 + y2) / 2;
    midpointsY.push(midpointY);
  }

  return midpointsY;
};

const drawHorizontalArrows = (midpointsYCoords) => {
  const svg = d3.select("svg");

  const startX = config.rectWidth / 2;
  const endX = config.rectWidth + config.rectSpacing;

  midpointsYCoords.forEach((midpointY) => {
    drawRightArrow(svg, startX, midpointY, endX, midpointY);
  });
};

const drawRectanglesRight = (midpointsYCoords) => {
  const svg = d3.select("svg");
  const xOffset = config.rectWidth + config.rectSpacing;

  midpointsYCoords.forEach((midpointY) => {
    const y = midpointY - config.rectHeight / 2;

    svg
      .append("rect")
      .attr("width", config.rectWidth)
      .attr("height", config.rectHeight)
      .attr("x", xOffset)
      .attr("y", y)
      .attr("fill", config.rectFill)
      .attr("stroke", config.rectStroke);
  });
};

const drawTextRight = (svg, data, xOffset, midpointsYCoords) => {
  const filteredData = data.reduce((acc, d) => {
    acc[d.boxNumber] = acc[d.boxNumber] || [];
    acc[d.boxNumber].push(d);
    return acc;
  }, []);

  filteredData.forEach((lines, textBoxNumber) => {
    const midpointY = midpointsYCoords[textBoxNumber];
    const textBoxY =
      midpointY - (lines.length * config.lineHeight) / 2 + config.offsetLineY;

    lines.forEach((d, lineNumber) => {
      svg
        .append("text")
        .attr("text-anchor", "middle")
        .attr("font-family", "Arial, Helvetica, sans-serif")
        .attr("font-size", config.fontSize)
        .attr("x", xOffset)
        .attr("y", textBoxY + lineNumber * config.lineHeight)
        .text(d.lineContent);
    });
  });
};

(async () => {
  const primaryData = await fetchData(
    "../../data/output/viz-data/vizDataRemaining.csv"
  );

  const svg = createSvg();

  const primaryCoords = drawRectanglesLeft(svg, primaryData, 0);

  drawTextLeft(svg, primaryData, config.rectWidth / 2, primaryCoords);

  drawLinesLeft(primaryCoords, 0);

  const midpointsYCoords = getMidpointsYCoords(primaryCoords);
  drawHorizontalArrows(midpointsYCoords, primaryCoords);

  drawRectanglesRight(midpointsYCoords);

  const secondaryData = await fetchData(
    "../../data/output/viz-data/vizDataExcluded.csv"
  );
  drawTextRight(
    svg,
    secondaryData,
    (3 / 2) * config.rectWidth + config.rectSpacing,
    midpointsYCoords
  );
})();
