(function() {
    'use strict';

    function addDeleteAction() {
        const context = SillyTavern.getContext();
        if (!context) {
            console.warn('Delete After Here: context not available');
            return false;
        }

        // Ensure messageActions exists as an array
        if (!Array.isArray(context.messageActions)) {
            console.warn('Delete After Here: messageActions is not an array, creating it.');
            context.messageActions = [];
        }

        // Check if we already added this action (avoid duplicates)
        const existing = context.messageActions.find(a => a.id === 'delete-after-here');
        if (existing) {
            console.log('Delete After Here: action already registered.');
            return true;
        }

        // Register the action
        context.messageActions.push({
            id: 'delete-after-here',
            label: 'Delete all after this message',
            icon: 'fa-trash-can',
            action: (messageId) => {
                // Get chat – try multiple approaches
                let chat = context.chat;
                if (!chat && typeof context.getChat === 'function') {
                    chat = context.getChat();
                }
                if (!chat) {
                    console.warn('Delete After Here: chat not available');
                    return;
                }

                const index = chat.findIndex(msg => msg.id === messageId);
                if (index === -1) {
                    console.warn('Delete After Here: message not found');
                    return;
                }

                const count = chat.length - index - 1;
                if (!confirm(`Delete this message and ${count} message${count !== 1 ? 's' : ''} after it?`)) {
                    return;
                }

                chat.splice(index);

                // Save and refresh
                if (typeof context.saveChat === 'function') {
                    context.saveChat();
                } else if (typeof context.setChat === 'function') {
                    context.setChat(chat);
                }

                if (typeof context.refreshMessages === 'function') {
                    context.refreshMessages();
                } else if (typeof context.loadChat === 'function') {
                    context.loadChat();
                }

                if (typeof context.toast === 'function') {
                    context.toast('Deleted message and all following messages.', 'info');
                }
            }
        });

        console.log('✅ Delete After Here: action added.');
        return true;
    }

    // Try to add the action immediately, but if it fails, retry a few times
    function tryInit(attempts = 5) {
        if (window.SillyTavern) {
            const success = addDeleteAction();
            if (success) return;
        }

        if (attempts > 0) {
            console.log(`Delete After Here: retrying in 500ms (${attempts} attempts left)`);
            setTimeout(() => tryInit(attempts - 1), 500);
        } else {
            console.error('Delete After Here: failed to register after multiple attempts.');
        }
    }

    // Start the process
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        tryInit();
    } else {
        document.addEventListener('DOMContentLoaded', () => tryInit());
    }

    // Also listen for the ST-specific ready event
    document.addEventListener('SillyTavernReady', () => {
        // Give it a small delay to ensure everything is set up
        setTimeout(() => tryInit(5), 200);
    });
})();