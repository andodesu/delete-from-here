async function deleteAfter(messageId) {
    const context = getContext();
    if (!context) return;

    // Get chat and find index
    let chat = context.chat;
    if (!chat && typeof context.getChat === 'function') chat = context.getChat();
    if (!chat) return;

    let index = chat.findIndex(msg => String(msg.id) === String(messageId));
    if (index === -1) {
        const idx = parseInt(messageId);
        if (!isNaN(idx) && idx >= 0 && idx < chat.length) index = idx;
    }
    if (index === -1) return;

    const count = chat.length - index - 1;
    if (!confirm(`Delete this message and ${count} message${count !== 1 ? 's' : ''} after it?`)) return;

    // --- Bulk deletion (matching native) ---
    // 1. Clean up itemized prompts for all messages from index to end
    for (let i = chat.length - 1; i >= index; i--) {
        deleteItemizedPromptForMessage(i);
    }

    // 2. Remove DOM elements
    const chatElement = document.getElementById('chat');
    if (chatElement) {
        const mesElements = chatElement.querySelectorAll(`.mes[mesid="${index}"] ~ .mes, .mes[mesid="${index}"]`);
        mesElements.forEach(el => el.remove());
    }

    // 3. Truncate chat array
    chat.length = index;

    // 4. Mark as tainted
    chat_metadata.tainted = true;

    // 5. Save
    await saveChatConditional();

    // 6. Emit event
    await eventSource.emit(event_types.MESSAGE_DELETED, chat.length);

    // 7. UI cleanup (update last message class)
    const mes = document.querySelectorAll('.mes');
    mes.forEach(el => el.classList.remove('last_mes'));
    if (mes.length > 0) mes[mes.length - 1].classList.add('last_mes');

    // 8. Refresh UI
    if (typeof context.refreshMessages === 'function') context.refreshMessages();
    else if (typeof context.loadChat === 'function') context.loadChat();

    if (typeof context.toast === 'function') {
        context.toast(`Deleted ${count + 1} messages.`, 'info');
    }
}