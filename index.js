(function() {
    'use strict';

    function init() {
        // Get the Silly Tavern runtime context
        const context = SillyTavern.getContext();

        // Register a new message action
        context.messageActions.push({
            id: 'delete-after-here',
            label: 'Delete all after this message',
            icon: 'fa-trash-can',
            action: (messageId) => {
                // 1. Get the current chat array
                let chat = context.chat;
                if (!chat && typeof context.getChat === 'function') {
                    chat = context.getChat();
                }
                if (!chat) {
                    console.warn('Delete After Here: chat not available');
                    return;
                }

                // 2. Find the index of the clicked message
                const index = chat.findIndex(msg => msg.id === messageId);
                if (index === -1) {
                    console.warn('Delete After Here: message not found');
                    return;
                }

                // 3. Optional confirmation (remove if you don't want it)
                const count = chat.length - index - 1;
                if (!confirm(`Delete this message and ${count} message${count !== 1 ? 's' : ''} after it?`)) {
                    return;
                }

                // 4. Delete this message and everything after it
                chat.splice(index);

                // 5. Save the updated chat
                if (typeof context.saveChat === 'function') {
                    context.saveChat();
                } else if (typeof context.setChat === 'function') {
                    context.setChat(chat);
                }

                // 6. Refresh the UI
                if (typeof context.refreshMessages === 'function') {
                    context.refreshMessages();
                } else if (typeof context.loadChat === 'function') {
                    context.loadChat();
                }

                // 7. Show a toast notification
                if (typeof context.toast === 'function') {
                    context.toast('Deleted message and all following messages.', 'info');
                }
            }
        });

        console.log('✅ Delete After Here extension loaded.');
    }

    // Wait for SillyTavern to be fully ready
    if (window.SillyTavern) {
        init();
    } else {
        document.addEventListener('SillyTavernReady', init);
    }
})();