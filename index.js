function deleteFromHere(messageId) {
    if (!confirm("Delete this message and all following messages?")) return;

    const context = window.SillyTavernContext || window.getContext?.();

    if (!context || !Array.isArray(context.chat)) {
        console.error("[DeleteFromHere] No valid context.chat found", context);
        return;
    }

    const chat = context.chat;

    console.log("[DeleteFromHere] deleting from index:", messageId);

    chat.splice(messageId);

    // 🔴 IMPORTANT: force ST to recognize state change
    context.saveChat?.();
    window.saveChat?.();

    // 🔴 THIS is what actually triggers UI refresh in 1.18+
    context.eventSource?.emit?.(context.event_types?.CHAT_CHANGED);
    window.eventSource?.emit?.("chat_changed");

    // fallback hard refresh of chat view
    context.reloadCurrentChat?.();
    window.reloadCurrentChat?.();
}