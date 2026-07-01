(function() {
    'use strict';

    console.log('🚀 Delete After Here: Using native context.deleteMessage.');

    function getContext() {
        return window.SillyTavern ? SillyTavern.getContext() : null;
    }

    function deleteAfter(messageId) {
        const context = getContext();
        if (!context) {
            console.error('❌ Context not found.');
            return;
        }

        // Get chat array to find the index
        let chat = context.chat;
        if (!chat && typeof context.getChat === 'function') chat = context.getChat();
        if (!chat) {
            console.error('❌ Chat array not found.');
            return;
        }

        // Find index from messageId
        let index = chat.findIndex(msg => String(msg.id) === String(messageId));
        if (index === -1) {
            const idx = parseInt(messageId);
            if (!isNaN(idx) && idx >= 0 && idx < chat.length) index = idx;
        }
        if (index === -1) {
            console.error(`❌ Message ID ${messageId} not found.`);
            return;
        }

        const count = chat.length - index - 1;
        if (!confirm(`Delete this message and ${count} message${count !== 1 ? 's' : ''} after it?`)) return;

        // --- Use native context.deleteMessage ---
        if (typeof context.deleteMessage !== 'function') {
            console.error('❌ context.deleteMessage is not a function!');
            console.log('🔍 context.deleteMessage:', context.deleteMessage);
            return;
        }

        console.log(`📤 Calling context.deleteMessage with index ${index} (mesid ${messageId})`);

        try {
            // Call the native delete function – it should handle saving and UI refresh
            // It may be synchronous or async; we'll call and then force a refresh just in case.
            const result = context.deleteMessage(index); // try with index
            // If it returns a promise, we could await, but we'll just proceed.
            // Many ST functions are synchronous.
            console.log('✅ context.deleteMessage returned:', result);
        } catch (e) {
            console.error('❌ Error calling context.deleteMessage:', e);
            if (typeof context.toast === 'function') {
                context.toast('DeleteAfterHere: Error during deletion, see console.', 'error');
            }
            return;
        }

        // Force UI refresh (in case deleteMessage doesn't refresh)
        const refresh = () => {
            if (typeof context.refreshMessages === 'function') context.refreshMessages();
            else if (typeof context.loadChat === 'function') context.loadChat();
        };
        refresh();
        setTimeout(refresh, 150);

        if (typeof context.toast === 'function') {
            context.toast('Deleted messages using native deleteMessage.', 'info');
        }
        console.log('✅ Deletion via native deleteMessage complete.');
    }

    // --- The rest of the extension (menu injection, processMessage, scan, init) ---
    function addDeleteOptionToMenu(menu, messageId) {
        if (!menu || menu.querySelector('.delete-after-here-item')) return false;

        const item = document.createElement('div');
        item.className = 'delete-after-here-item mes_button';
        item.style.cursor = 'pointer';
        item.textContent = '🗑️ Delete all after';
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteAfter(messageId);
            // Close the menu
            const mesElement = menu.closest('.mes');
            if (mesElement) {
                const toggleBtn = mesElement.querySelector('.mes_button.extraMesButtonsHint');
                if (toggleBtn) toggleBtn.click();
            }
        });
        menu.appendChild(item);
        console.log(`✅ Option added for message ${messageId}`);
        return true;
    }

    function getMessageId(el) {
        const id = el.getAttribute('mesid');
        if (id !== null) return id;
        if (el.dataset.messageId) return el.dataset.messageId;
        if (el.dataset.id) return el.dataset.id;
        if (el.id) return el.id;
        return null;
    }

    function processMessage(el) {
        const id = getMessageId(el);
        if (!id) return;

        let toggle = el.querySelector('.mes_button.extraMesButtonsHint');
        if (!toggle) toggle = el.querySelector('[data-toggle="dropdown"]');
        if (!toggle) toggle = el.querySelector('.dropdown-toggle');
        if (!toggle) return;

        if (toggle.dataset.deleteAfterHereHook === 'true') return;
        toggle.dataset.deleteAfterHereHook = 'true';

        toggle.addEventListener('click', function() {
            setTimeout(() => {
                let menu = el.querySelector('.mes_buttons');
                if (!menu) menu = document.querySelector('.mes_buttons:not(.delete-after-here-item)');
                if (menu) addDeleteOptionToMenu(menu, id);
            }, 200);
        });
        console.log(`✅ Toggle hooked for message ${id}`);
    }

    function scan() {
        const container = document.querySelector('#chat');
        if (!container) return false;

        const msgs = container.querySelectorAll('.mes');
        if (!msgs.length) return false;

        console.log(`✅ Found ${msgs.length} messages.`);
        msgs.forEach(processMessage);

        new MutationObserver(() => {
            container.querySelectorAll('.mes').forEach(el => {
                const toggle = el.querySelector('.mes_button.extraMesButtonsHint');
                if (toggle && !toggle.dataset.deleteAfterHereHook) processMessage(el);
            });
        }).observe(container, { childList: true, subtree: true });

        return true;
    }

    let attempts = 0, interval;
    function init() {
        if (interval) clearInterval(interval);
        interval = setInterval(() => {
            attempts++;
            if (scan()) {
                clearInterval(interval);
                interval = null;
                console.log('✅ Extension ready.');
            } else if (attempts >= 30) {
                clearInterval(interval);
                interval = null;
                console.error('❌ Failed to initialise after 30 attempts.');
            }
        }, 1000);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
    document.addEventListener('SillyTavernReady', () => setTimeout(init, 500));
})();