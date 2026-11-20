// Text-free static Harness schematic, also available when both canvas contexts fail.
export function rigFallback(mode='base') {
  const device=(x,y,scale,variant='base')=>`<g transform="translate(${x} ${y}) scale(${scale})" fill="#130c13" stroke="#ED3D8C" stroke-width="3">
    <path d="M20 180H220V206H20Z M38 180V60H72 M202 180V60H168"/>
    <path d="M70 38H170V144H70Z" fill="none"/>
    <rect x="101" y="72" width="38" height="49" fill="#F5EDF1" stroke="#FF66A8"/>
    <rect x="112" y="33" width="10" height="10" fill="#FF66A8"/>
    <path d="M83 148H157V175H83Z M88 156H148 M88 165H132 M175 134V170 M186 134V170 M197 134V170"/>
    <path d="M20 186V166 M220 186V166 M20 186H220"/>
    ${variant==='coding'?'<path d="M36 72H60V96H36Z M36 102H60V126H36Z"/>':''}
    ${variant==='super'?'<path d="M6 160V35H28V160 M212 160V35H234V160"/>':''}
    ${variant==='personal'?'<path d="M38 98H66V145H38Z" fill="#71304f"/>':''}
  </g>`;
  const content=mode==='variants'
    ? ['coding','super','personal'].map((v,i)=>device(12+i*248,20,1,v)).join('')
    : mode==='assembly'
      ? `${device(250,15,1)}<g fill="#160d16" stroke="#FF66A8" stroke-width="3"><path d="M140 60H215V90H140Z M520 110H570V155H520Z M170 160H205V198H170Z"/><path stroke-dasharray="4 8" d="M215 75H265 M490 130H520"/></g>`
      : device(0,5,1);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${mode==='base'?240:760} 240" aria-hidden="true">${content}</svg>`;
}
