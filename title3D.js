document.addEventListener("DOMContentLoaded", () => {
  const svgObject = document.getElementById("svgObject");

  svgObject.addEventListener("load", () => {
    const svgDoc = svgObject.contentDocument;
    const svgRoot = svgDoc.documentElement;
    const svgNS = "http://www.w3.org/2000/svg";
    const shapes = Array.from(svgDoc.querySelectorAll("path, polygon, rect, circle"));
    if (!shapes.length) return;

    // ─── Constants ───
    const OUTWARD_OFFSET = -6;    // Base extrusion factor.
    const MOUSE_FACTOR = -0.01;   // How much mouse movement affects extrusion.
    const SMOOTHING = 0.1;        // Easing for mouse offsets.

    // Global mouse offset variables.
    let mouseOffsetX = 0;
    let mouseOffsetY = 0;
    let targetMouseOffsetX = 0;
    let targetMouseOffsetY = 0;

    // ─── Update mouse offsets ───
    document.addEventListener("mousemove", (e) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      targetMouseOffsetX = (e.clientX - centerX) * MOUSE_FACTOR;
      targetMouseOffsetY = (e.clientY - centerY) * MOUSE_FACTOR;
    });

    // ─── Create the overall extrusion layer ───
    const extrusionLayer = svgDoc.createElementNS(svgNS, "g");
    extrusionLayer.setAttribute("id", "extrusion-layer");
    extrusionLayer.setAttribute("opacity", "0.8");
    svgRoot.insertBefore(extrusionLayer, svgRoot.firstChild);

    // ─── Helper: Get the raw outline points from the shape’s geometry ───
    // (Do NOT bake in the transform here.)
    function getOutlinePoints(shape) {
      const tag = shape.tagName.toLowerCase();
      let pts = [];
      if (tag === "polygon" || tag === "polyline") {
        const pointsList = shape.points;
        for (let i = 0, len = pointsList.numberOfItems; i < len; i++) {
          let pt = pointsList.getItem(i);
          pts.push([pt.x, pt.y]);
        }
      } else if (tag === "rect") {
        const x = parseFloat(shape.getAttribute("x")) || 0;
        const y = parseFloat(shape.getAttribute("y")) || 0;
        const width = parseFloat(shape.getAttribute("width"));
        const height = parseFloat(shape.getAttribute("height"));
        pts = [
          [x, y],
          [x + width, y],
          [x + width, y + height],
          [x, y + height],
        ];
      } else if (tag === "circle") {
        const cx = parseFloat(shape.getAttribute("cx"));
        const cy = parseFloat(shape.getAttribute("cy"));
        const r = parseFloat(shape.getAttribute("r"));
        const numPoints = 10; // For performance.
        for (let i = 0; i < numPoints; i++) {
          const angle = (2 * Math.PI * i) / numPoints;
          pts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
        }
      } else if (tag === "path") {
        const totalLength = shape.getTotalLength();
        const numPoints = 10;
        for (let i = 0; i <= numPoints; i++) {
          const point = shape.getPointAtLength((totalLength * i) / numPoints);
          pts.push([point.x, point.y]);
        }
      }
      return pts;
    }

    // ─── Set up extrusion groups for each shape ───
    const extrusions = shapes.map(shape => {
      // Get raw geometry points.
      const originalPoints = getOutlinePoints(shape);
      // The FX script will update offX/offY.
      shape.dataset.offX = "0";
      shape.dataset.offY = "0";

      const extrudeGroup = svgDoc.createElementNS(svgNS, "g");
      extrusionLayer.appendChild(extrudeGroup);

      // Create the shadow copy.
      const offsetCopy = shape.cloneNode(true);
      offsetCopy.setAttribute("fill", "darkgreen");
      extrudeGroup.appendChild(offsetCopy);

      // Create side polygons (one per edge).
      const sidePolys = [];
      for (let i = 0, len = originalPoints.length; i < len; i++) {
        const poly = svgDoc.createElementNS(svgNS, "polygon");
        poly.setAttribute("fill", "darkgreen");
        extrudeGroup.appendChild(poly);
        sidePolys.push(poly);
      }

      return { shape, offsetCopy, sidePolys, originalPoints };
    });

    // ─── Helper: Get the SVG's horizontal center ───
    function getSVGCenterX() {
      if (svgRoot.hasAttribute("viewBox")) {
        const vb = svgRoot.getAttribute("viewBox").split(/[\s,]+/).map(Number);
        return vb[0] + vb[2] / 2;
      } else if (svgRoot.hasAttribute("width")) {
        return parseFloat(svgRoot.getAttribute("width")) / 2;
      } else {
        return svgRoot.clientWidth / 2;
      }
    }

    // ─── Update loop for extrusions ───
    function updateExtrusions() {
      // Ease mouse offsets.
      mouseOffsetX += (targetMouseOffsetX - mouseOffsetX) * SMOOTHING;
      mouseOffsetY += (targetMouseOffsetY - mouseOffsetY) * SMOOTHING;

      const parentCenterX = getSVGCenterX();

      extrusions.forEach(({ shape, offsetCopy, sidePolys, originalPoints }) => {
        // Get the FX offsets stored by the fx script.
        const offX = +shape.dataset.offX || 0;
        const offY = +shape.dataset.offY || 0;

        // Get bounding box info to compute a relative horizontal offset.
        const bbox = shape.getBBox();
        const shapeCenterX = bbox.x + bbox.width / 2;
        const relativeX = (shapeCenterX - parentCenterX) / parentCenterX;
        const baseHorizontalOffset = OUTWARD_OFFSET * relativeX;
        const baseVerticalOffset = -OUTWARD_OFFSET;

        // Extrusion (3D) offset computed from mouse.
        const finalHorizontalOffset = baseHorizontalOffset + mouseOffsetX;
        const finalVerticalOffset = baseVerticalOffset + mouseOffsetY;

        // Get the original transform stored on the shape.
        // (This should have been set by your data/color script.)
        const origTransform = shape.dataset.originalTransform || "";
        let baseX = 0, baseY = 0;
        const m = origTransform.match(/translate\(\s*([\d.-]+)[ ,]+([\d.-]+)\s*\)/);
        if (m) {
          baseX = parseFloat(m[1]);
          baseY = parseFloat(m[2]);
        }
        // The effective front face translation is (baseX + offX, baseY + offY).
        // The shadow copy should be offset further by the extrusion offset.
        offsetCopy.setAttribute(
          "transform",
          `translate(${baseX + offX + finalHorizontalOffset}, ${baseY + offY + finalVerticalOffset})`
        );

        // Update side polygons so they connect the front face and its shadow.
        // Compute the effective front face point: raw geometry point + base translation + FX offset.
        // Then, the corresponding shadow point is that plus the extrusion offset.
        originalPoints.forEach((pt, j) => {
          const p1x = pt[0] + baseX + offX;
          const p1y = pt[1] + baseY + offY;
          const next = originalPoints[(j + 1) % originalPoints.length];
          const p2x = next[0] + baseX + offX;
          const p2y = next[1] + baseY + offY;
          const q1x = p1x + finalHorizontalOffset;
          const q1y = p1y + finalVerticalOffset;
          const q2x = p2x + finalHorizontalOffset;
          const q2y = p2y + finalVerticalOffset;
          const pointsStr = `${p1x},${p1y} ${p2x},${p2y} ${q2x},${q2y} ${q1x},${q1y}`;
          sidePolys[j].setAttribute("points", pointsStr);
        });
      });
      requestAnimationFrame(updateExtrusions);
    }
    updateExtrusions();
  });
});