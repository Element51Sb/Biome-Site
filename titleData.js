document.addEventListener("DOMContentLoaded", () => {
    const svgObject = document.getElementById("svgObject");
  
    svgObject.addEventListener("load", () => {
      const svgDoc = svgObject.contentDocument;
      const svgRoot = svgDoc.documentElement;
      const shapes = [...svgDoc.querySelectorAll("path, polygon, rect, circle")];
      if (!shapes.length) return;
  
      // ── Adjust SVG to prevent horizontal clipping ──
      // 1. Expand the viewBox horizontally (if defined)
      const viewBoxAttr = svgRoot.getAttribute("viewBox");
      if (viewBoxAttr) {
        // Parse the viewBox values: minX, minY, width, height
        const [x, y, width, height] = viewBoxAttr.split(/[\s,]+/).map(Number);
        const HORIZONTAL_MARGIN = 30; // Increase as needed to leave extra room on each side.
        svgRoot.setAttribute(
          "viewBox",
          `${x - HORIZONTAL_MARGIN} ${y} ${width + 2 * HORIZONTAL_MARGIN} ${height}`
        );
      }
      // 2. Make sure content isn’t clipped by the SVG element itself.
      svgRoot.setAttribute("overflow", "visible");
  
      // ── Color & Attribute Setup ──
      const COLOR_LOW = [203, 255, 84];  // Lighter (Bottom)
      const COLOR_HIGH = [135, 254, 50];   // Darker (Top)
      const TOTAL_HEIGHT = svgRoot.getBBox().height;
  
      shapes.forEach(shape => {
        const bbox = shape.getBBox();
        const shapeY = bbox.y + bbox.height / 2;
        const factor = shapeY / TOTAL_HEIGHT;
        const color = COLOR_LOW.map((low, i) =>
          Math.round(low + (COLOR_HIGH[i] - low) * factor)
        );
  
        shape.setAttribute("fill", `rgb(${color.join(",")})`);
        shape.dataset.originalTransform = shape.getAttribute("transform") || "";
        shape.dataset.offsetX = "0";
        shape.dataset.offsetY = "0";
      });
  
      // Store shapes globally for `titleMove.js`
      window.svgShapes = shapes;
    });
  });  