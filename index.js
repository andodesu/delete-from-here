(function() {
    'use strict';

    console.log('🚀 Delete After Here: Native-compatible (no fallback) version.');

    function getContext() {
        return window.SillyTavern ? SillyTavern.getContext() : null;
    }

    function deleteAfter(messageId) {
        const context = getContext();
        if (!context) {
            console.error('❌ Context not found. Aborting.');
            return;
        }

        // Get chat to find index
        let chat = context.chat;
        if (!chat && typeof context.getChat === 'function') chat = context.getChat();
        if (!chat) {
            console.error('❌ Chat array not found. Aborting.');
            return;
        }

        let index = chat.findIndex(msg => String(msg.id) === String(messageId));
        if (index === -1) {
            const idx = parseInt(messageId);
            if (!isNaN(idx) && idx >= 0 && idx < chat.length) index = idx;
        }
        if (index === -1) {
            console.error(`❌ Message ID ${messageId} not found in chat array. Aborting.`);
            return;
        }

        const count = chat.length - index - 1;
        if (!confirm(`Delete this message and ${count} message${count !== 1 ? 's' : ''} after it?`)) return;

        // --- Try to locate the native deleteSelectedMessages ---
        const deleteFn = window.deleteSelectedMessages || context.deleteSelectedMessages;
        if (typeof deleteFn !== 'function') {
            console.error('❌ Native deleteSelectedMessages not found!');
            console.log('🔍 window.deleteSelectedMessages:', window.deleteSelectedMessages);
            console.log('🔍 context.deleteSelectedMessages:', context.deleteSelectedMessages);
            console.log('🔍 Available functions on window:', Object.keys(window).filter(k => typeof window[k] === 'function').sort());
            console.log('🔍 Available functions on context:', Object.keys(context).filter(k => typeof context[k] === 'function').sort());
            // Optionally show a toast
            if (typeof context.toast === 'function') {
                context.toast('DeleteAfterHere: Native function missing, check console.', 'error');
            }
            return;
        }

        // Clear any existing checkbox selections
        document.querySelectorAll('.del_checkbox:checked').forEach(cb => cb.checked = false);

        // Find the current message's numeric ID
        const currentId = parseInt(messageId);
        if (isNaN(currentId)) {
            console.error(`❌ messageId "${messageId}" is not a number, cannot select checkboxes by mesid.`);
            return;
        }

        // Select all checkboxes for messages with mesid >= currentId
        const allMes = document.querySelectorAll('.mes');
        let selectedCount = 0;
        allMes.forEach(mes => {
            const idAttr = mes.getAttribute('mesid');
            if (idAttr === null) {
                console.warn('⚠️ .mes element missing mesid attribute:', mes);
                return;
            }
            const id = parseInt(idAttr);
            if (!isNaN(id) && id >= currentId) {
                const cb = mes.querySelector('.del_checkbox');
                if (cb) {
                    cb.checked = true;
                    selectedCount++;
                } else {
                    console.warn(`⚠️ No .del_checkbox found inside mes with mesid ${id}.`);
                }
            }
        });

        console.log(`✅ Selected ${selectedCount} checkboxes for deletion.`);

        // Call the native function (it will handle save, refresh, and its own confirm)
        try {
            deleteFn();
        } catch (e) {
            console.error('❌ Error calling deleteSelectedMessages:', e);
            if (typeof context.toast === 'function') {
                context.toast('DeleteAfterHere: Error during deletion, see console.', 'error');
            }
        }
    }

    // --- The rest of the extension (addDeleteOptionToMenu, processMessage, scan, init) remains the same ---
    // (I include it here for completeness; the only change is the deleteAfter function above)

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