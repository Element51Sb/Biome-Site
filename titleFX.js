document.addEventListener("DOMContentLoaded", () => {
    // Adjust these to change the feel:
    const TRIGGER = 30,           // Distance from mouse to trigger effect
          MAX_MOVE = 20,          // Base bulge offset (increases with closeness)
          RETURN = 0.15,          // Easing factor (also scales jitter speed)
          HAND_JITTER = 5;        // Additional random offset when near
    
    let svgRoot, mouseX = 0, mouseY = 0;
    const svgObj = document.getElementById("svgObject");
  
    document.addEventListener("mousemove", e => {
      if (!svgRoot) return;
      const r = svgObj.getBoundingClientRect();
      const pt = svgRoot.createSVGPoint();
      pt.x = e.clientX - r.left;
      pt.y = e.clientY - r.top;
      const loc = pt.matrixTransform(svgRoot.getScreenCTM().inverse());
      mouseX = loc.x;
      mouseY = loc.y;
    });
  
    function update() {
      if (window.svgShapes)
        window.svgShapes.forEach(s => {
          const { x, y, width, height } = s.getBBox();
          const cx = x + width / 2,
                cy = y + height / 2,
                d = Math.hypot(mouseX - cx, mouseY - cy),
                strength = Math.max(0, 1 - d / TRIGGER);
  
          // Retrieve current offset (if any)
          let offX = parseFloat(s.dataset.offX) || 0,
              offY = parseFloat(s.dataset.offY) || 0;
  
          if (d < TRIGGER) {
            // Set a fixed direction (with a small random tweak) if not already set
            let angle = s.dataset.angle ? parseFloat(s.dataset.angle)
                                        : Math.atan2(cy - mouseY, cx - mouseX) + (Math.random() - 0.5) * (Math.PI / 8);
            s.dataset.angle = angle;
  
            // Use a stored jitter scalar that slowly eases toward a new random target
            let j = parseFloat(s.dataset.j) || 0;
            // Compute a target jitter—always positive so it always pushes a little further out.
            const targetJ = (((Math.random() * 0.5) + 0.5) * HAND_JITTER * strength);
            j += (targetJ - j) * RETURN;
            s.dataset.j = j;
  
            // Combined target: base bulge plus jitter, along the fixed direction
            const target = strength * MAX_MOVE + j,
                  targetX = Math.cos(angle) * target,
                  targetY = Math.sin(angle) * target;
            offX += (targetX - offX) * RETURN;
            offY += (targetY - offY) * RETURN;
          } else {
            // Ease back to original position if mouse is far away.
            offX += (0 - offX) * RETURN;
            offY += (0 - offY) * RETURN;
            delete s.dataset.angle;
            s.dataset.j = 0;
          }
  
          s.setAttribute("transform", `${s.dataset.originalTransform} translate(${offX}, ${offY})`);
          s.dataset.offX = offX;
          s.dataset.offY = offY;
        });
      requestAnimationFrame(update);
    }
  
    svgObj.addEventListener("load", () => {
      svgRoot = svgObj.contentDocument.documentElement;
      requestAnimationFrame(update);
    });
  });  