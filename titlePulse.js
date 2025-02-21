document.addEventListener("DOMContentLoaded", () => {
    const svgObject = document.getElementById("svgObject");
  
    svgObject.addEventListener("load", () => {
      const svgDoc = svgObject.contentDocument;
      // Use the front-layer shapes if available; otherwise, select all shapes.
      const frontShapes = window.svgShapes
        ? window.svgShapes
        : Array.from(svgDoc.querySelectorAll("path, polygon, rect, circle"));
  
      // ─── Constants ───
      const MIN_OPACITY = 0.2;          // Lowest opacity value.
      const MAX_OPACITY = 1.0;          // Highest opacity value.
      // START_OPACITY is set to the middle of MIN_OPACITY and MAX_OPACITY, rounded to 1 decimal.
      const START_OPACITY = parseFloat(((MIN_OPACITY + MAX_OPACITY) / 2).toFixed(1));
      const MIN_PULSE_DURATION = 2000;  // Minimum total pulse duration in ms.
      const MAX_PULSE_DURATION = 6000;  // Maximum total pulse duration in ms.
  
      // Create a pulse object for each shape.
      const pulses = frontShapes.map(shape => {
        // Set the initial opacity.
        shape.style.opacity = START_OPACITY.toString();
        return {
          element: shape,
          // Start time is offset randomly so they don't all pulse in sync.
          startTime: performance.now() + Math.random() * 500,
          // Total duration is random between MIN_PULSE_DURATION and MAX_PULSE_DURATION.
          cycleDuration: MIN_PULSE_DURATION + Math.random() * (MAX_PULSE_DURATION - MIN_PULSE_DURATION),
          // Fixed starting opacity.
          startOpacity: START_OPACITY
        };
      });
  
      // A single update loop for all pulse objects.
      function updatePulses() {
        const now = performance.now();
        for (let pulse of pulses) {
          let elapsed = now - pulse.startTime;
          // If the current cycle is finished, restart the pulse cycle.
          if (elapsed > pulse.cycleDuration) {
            pulse.startTime = now;
            pulse.cycleDuration = MIN_PULSE_DURATION + Math.random() * (MAX_PULSE_DURATION - MIN_PULSE_DURATION);
            pulse.startOpacity = START_OPACITY;
            elapsed = 0;
          }
          const halfDuration = pulse.cycleDuration / 2;
          let newOpacity;
          if (elapsed < halfDuration) {
            // Phase 1: Animate from startOpacity up to MAX_OPACITY.
            const t = elapsed / halfDuration;
            newOpacity = pulse.startOpacity + (MAX_OPACITY - pulse.startOpacity) * t;
          } else {
            // Phase 2: Animate from MAX_OPACITY down to MIN_OPACITY.
            const t = (elapsed - halfDuration) / halfDuration;
            newOpacity = MAX_OPACITY - (MAX_OPACITY - MIN_OPACITY) * t;
          }
          // Round to one decimal place.
          newOpacity = parseFloat(newOpacity.toFixed(1));
          pulse.element.style.opacity = newOpacity.toString();
        }
        requestAnimationFrame(updatePulses);
      }
  
      requestAnimationFrame(updatePulses);
    });
  });  