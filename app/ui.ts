// Közös, újrahasznált stílusosztályok a főoldalhoz és az admin felülethez.

const btnBase =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227] disabled:cursor-not-allowed disabled:opacity-50 sm:text-base";

export const btnPrimary = `${btnBase} bg-[#c9a227] text-[#1b1305] hover:bg-[#dcb83c]`;
export const btnSecondary = `${btnBase} border border-[#45536a] bg-[#212836] text-[#f4f1e8] hover:bg-[#2b3445]`;
export const btnDanger = `${btnBase} border border-red-400/50 bg-red-500/10 text-red-100 hover:bg-red-500/20`;
export const btnIcon =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#45536a] bg-[#212836] text-xl text-[#f4f1e8] transition hover:bg-[#2b3445] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]";

export const inputCls =
  "w-full min-h-11 rounded-lg border border-[#45536a] bg-[#212836] px-3 py-2 text-base text-[#f4f1e8] placeholder:text-[#8792a4] focus:border-[#c9a227] focus:outline-none focus:ring-2 focus:ring-[#c9a227]/40";
export const labelCls = "flex flex-col gap-1.5 text-sm font-medium text-[#c3cad5]";

export const cardCls = "rounded-2xl border border-[#45536a] bg-[#1b212b]/90 p-4 sm:p-6";
export const panelCls = "rounded-xl border border-[#45536a] bg-[#212836] p-4 sm:p-5";
export const navCls =
  "sticky top-2 z-40 mb-4 rounded-2xl border border-[#45536a] bg-[#1b212b]/95 p-3 shadow-lg backdrop-blur md:mb-6";
