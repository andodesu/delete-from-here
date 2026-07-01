(function() {
    'use strict';

    console.log('🚀 Delete After Here: Using native deleteMessage (official API).');

    function getContext() {
        return window.SillyTavern ? SillyTavern.getContext() : null;
    }

    async function deleteAfter(messageId) {
        const context = getContext();
        if (!context) {
            console.error('❌ Context not found.');
            return;
        }

        let chat = context.chat;
        if (!chat && typeof context.getChat === 'function') chat = context.getChat();
        if (!chat) {
            console.error('❌ Chat array not found.');
            return;
        }

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

        const currentIdNum = parseInt(messageId);
        const allMes = document.querySelectorAll('.mes');
        const idsToDelete = [];
        allMes.forEach(mes => {
            const mesIdAttr = mes.getAttribute('mesid');
            if (mesIdAttr !== null) {
                const idNum = parseInt(mesIdAttr);
                if (!isNaN(idNum) && idNum >= currentIdNum) {
                    idsToDelete.push(idNum);
                }
            }
        });
        idsToDelete.sort((a, b) => b - a);

        console.log(`📤 Will delete ${idsToDelete.length} messages with mesid:`, idsToDelete);

        if (typeof context.deleteMessage !== 'function') {
            console.error('❌ context.deleteMessage is not a function!');
            return;
        }

        let deleted = 0;
        for (const mesId of idsToDelete) {
            try {
                console.log(`🗑️ Deleting message with mesid ${mesId}`);
                await context.deleteMessage(mesId);
                deleted++;
            } catch (e) {
                console.error(`❌ Error deleting message ${mesId}:`, e);
            }
        }

        console.log(`✅ Deleted ${deleted} messages using native deleteMessage.`);

        const refresh = () => {
            if (typeof context.refreshMessages === 'function') context.refreshMessages();
            else if (typeof context.loadChat === 'function') context.loadChat();
        };
        refresh();
        setTimeout(refresh, 150);

        if (typeof context.toast === 'function') {
            context.toast(`Deleted ${deleted} messages.`, 'info');
        }
    }

    // --- Updated: scissor icon instead of text ---
    function addDeleteOptionToMenu(menu, messageId) {
        if (!menu || menu.querySelector('.delete-after-here-item')) return false;

        const item = document.createElement('div');
        item.className = 'delete-after-here-item mes_button';
        item.style.cursor = 'pointer';
        item.title = 'Delete all after this message';

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-scissors';
        icon.style.fontSize = '1.1em';
        item.appendChild(icon);

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteAfter(messageId);
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

    // --- Rest of the extension unchanged ---
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