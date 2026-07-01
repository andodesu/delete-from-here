function deleteFromHere(index) {
    if (!confirm("Delete this message and all following messages?")) return;

    const context = window.SillyTavernContext || window.getContext?.();

    // fallback chain to find chat
    const chat = context?.chat || window.chat;

    if (!Array.isArray(chat)) {
        console.error("[DFH] chat not found");
        return;
    }

    console.log("[DFH] deleting from", index);

    // 🔴 KEY FIX: ensure index is valid in real chat array
    const realIndex = chat.findIndex((_, i) => i === index);

    const start = realIndex >= 0 ? realIndex : index;

    // remove messages
    chat.splice(start);

    // 🔴 force ST to rebuild state properly
    try {
        context?.saveChat?.();
    } catch {}

    try {
        window.saveChat?.();
    } catch {}

    // 🔴 MOST IMPORTANT: trigger full refresh properly
    try {
        context?.eventSource?.emit?.(context?.event_types?.CHAT_CHANGED);
    } catch {}

    try {
        window.eventSource?.emit?.("chat_changed");
    } catch {}

    // fallback hard reload (this is what guarantees visible change)
    try {
        context?.reloadCurrentChat?.();
    } catch {}

    try {
        window.reloadCurrentChat?.();
    } catch {}
}