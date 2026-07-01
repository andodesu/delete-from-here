function deleteFromHere(messageId) {
    if (messageId == null || messageId < 0) return;

    if (!confirm("Delete this message and all following messages?")) return;

    const context = window.SillyTavernContext || window.getContext?.();

    const chat = context?.chat || window.chat;

    if (!chat) {
        console.error("Chat context not found");
        return;
    }

    chat.splice(messageId);

    context?.saveChat?.();
    window.saveChat?.();

    context?.eventSource?.emit?.("chat_changed");
    window.eventSource?.emit?.("chat_changed");

    context?.reloadCurrentChat?.();
    window.reloadCurrentChat?.();
}