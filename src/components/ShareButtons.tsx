"use client";

import { useState } from "react";

export function ShareButtons({
  title,
  text,
  saleId,
  chain,
}: {
  title: string;
  text: string;
  saleId?: string;
  chain?: string;
}) {
  const [copied, setCopied] = useState(false);

  function shareUrl(): string {
    return window.location.href;
  }

  function track(channel: string) {
    const payload = JSON.stringify({
      type: "share",
      data: { channel, saleId: saleId ?? "", chain: chain ?? "" },
    });
    // sendBeacon survives the page being backgrounded by the share sheet
    if (!navigator.sendBeacon?.("/api/events", new Blob([payload], { type: "application/json" }))) {
      fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
    }
  }

  function openWhatsApp() {
    track("whatsapp");
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${shareUrl()}`)}`, "_blank");
  }

  function openViber() {
    track("viber");
    window.location.href = `viber://forward?text=${encodeURIComponent(`${text}\n${shareUrl()}`)}`;
  }

  async function shareNative() {
    track("native");
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl() });
        return;
      } catch {
        // user closed the share sheet — nothing to do
      }
      return;
    }
    await navigator.clipboard.writeText(`${text}\n${shareUrl()}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-ink-soft">Shpërndaje:</span>
      <button
        onClick={openWhatsApp}
        className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3.5 py-2 text-xs font-bold text-white transition hover:opacity-90"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.5 14.1c-.2.7-1.3 1.3-1.9 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5.1-4.5-.1-.2-1.2-1.6-1.2-3.1 0-1.5.8-2.2 1-2.5.3-.3.6-.4.8-.4h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6-.5.6c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1.1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1l1-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .6-.4 1Z" />
        </svg>
        WhatsApp
      </button>
      <button
        onClick={openViber}
        className="flex items-center gap-1.5 rounded-xl bg-[#7360F2] px-3.5 py-2 text-xs font-bold text-white transition hover:opacity-90"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <path d="M12 2C7 2 3 5 3 10.5c0 2.9 1.2 5 3.1 6.4l-.4 3.6c0 .4.4.7.8.5l3.3-1.9c.7.1 1.5.2 2.2.2 5 0 9-3 9-8.4S17 2 12 2Zm4.8 11.7c-.2.5-1 1-1.4 1-.4.1-.8.1-1.3-.1-2.7-1-4.4-3.4-4.6-3.6-.1-.2-1-1.3-1-2.4 0-1.2.6-1.7.8-1.9.2-.2.5-.3.6-.3h.5c.1 0 .3 0 .5.4l.7 1.6c0 .2.1.3 0 .5l-.3.5-.4.4c-.1.2-.2.3-.1.5.2.3.7 1 1.4 1.7.9.8 1.6 1 1.9 1.2.2.1.4 0 .5-.1l.7-.8c.2-.2.3-.2.6-.1l1.6.7c.2.1.4.2.4.3.1.1.1.4-.1.5Z" />
        </svg>
        Viber
      </button>
      <button
        onClick={shareNative}
        className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-xs font-bold text-ink transition hover:border-ink/40 hover:bg-paper"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
        </svg>
        {copied ? "U kopjua!" : "Tjetër"}
      </button>
    </div>
  );
}
