// Per-process ceiling bounds read-only API consumption, including during an IP flood.
const state=globalThis as typeof globalThis & { firstBellPreviewWindow?:{start:number;count:number} };
export function takePreviewSlot(now=Date.now()){
  let window=state.firstBellPreviewWindow;
  if(!window||now-window.start>=60_000)window=state.firstBellPreviewWindow={start:now,count:0};
  if(window.count>=20)return false;
  window.count++;return true;
}
