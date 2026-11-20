// Keep the approved text selectable by accessibility and presenter tooling.
export async function initPixelText(root = document) {
  for (const el of root.querySelectorAll('[data-pixeltext]')) {
    el.setAttribute('aria-label', el.dataset.pixeltext);
  }
  await document.fonts.ready;
}
