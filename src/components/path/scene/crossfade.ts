/* Reduced motion's cut (the benchmark's §4(f)): the board does not move
   between two steps, it crossfades. The frame on screen is copied into a
   plain canvas laid over the stage, the board cuts underneath, and the copy
   fades out. The copy is at the stage's CSS size, not its drawing buffer's:
   it shows for a fraction of a second, and it holds no GPU memory once it
   has gone. It is laid beside the stage rather than inside it, after it
   and before the board's tabs, so the tabs stay on top and nothing reading
   the stage's canvas finds a second one. */

/** Draws the outgoing frame with `drawOutgoing`, copies it, then lets the
 *  caller cut; the copy fades over `ms`. Does nothing where there is no
 *  stage on screen to fade. */
export function crossfade(
  canvas: HTMLCanvasElement,
  drawOutgoing: () => void,
  ms: number,
) {
  const stage = canvas.parentElement;
  const host = stage?.parentElement;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!stage || !host || width === 0 || height === 0) return;
  const copy = document.createElement("canvas");
  copy.width = width;
  copy.height = height;
  const context = copy.getContext("2d");
  if (!context) return;
  /* The WebGL buffer is only readable in the task that drew it. */
  drawOutgoing();
  context.drawImage(canvas, 0, 0, width, height);
  copy.setAttribute("aria-hidden", "true");
  copy.dataset.pathCrossfade = "";
  Object.assign(copy.style, {
    position: "absolute",
    left: `${stage.offsetLeft + canvas.offsetLeft}px`,
    top: `${stage.offsetTop + canvas.offsetTop}px`,
    width: `${width}px`,
    height: `${height}px`,
    pointerEvents: "none",
  });
  stage.after(copy);
  const done = () => {
    copy.remove();
    copy.width = 0;
  };
  copy
    .animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: ms,
      easing: "ease-out",
    })
    .finished.then(done, done);
}
