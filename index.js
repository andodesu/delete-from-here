(function() {
    'use strict';

    console.log('🚀 Delete After Here: Clean with show/hide events.');

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

        if (typeof context.deleteMessage !== 'function') {
            console.error('❌ context.deleteMessage is not a function!');
            return;
        }

        let deleted = 0;
        for (const mesId of idsToDelete) {
            try {
                await context.deleteMessage(mesId);
                deleted++;
            } catch (e) {
                console.error(`❌ Error deleting message ${mesId}:`, e);
            }
        }

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

    function addDeleteOptionToMenu(menu, messageId) {
        if (!menu) return;

        // Remove any existing item to avoid duplicates
        const existing = menu.querySelector('.delete-after-here-item');
        if (existing) existing.remove();

        const item = document.createElement('div');
        item.className = 'delete-after-here-item mes_button';
        item.style.cursor = 'pointer';
        item.title = 'Delete all after this message';

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-scissors fa-fw';
        icon.style.fontSize = '0.9em';
        icon.style.transform = 'translateY(-1px)';
        icon.style.display = 'inline-block';
        item.appendChild(icon);

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteAfter(messageId);
            // Close the dropdown
            const mesElement = menu.closest('.mes');
            if (mesElement) {
                const toggleBtn = mesElement.querySelector('.mes_button.extraMesButtonsHint');
                if (toggleBtn) toggleBtn.click();
            }
        });

        menu.appendChild(item);
    }

    function getMessageId(el) {
        const id = el.getAttribute('mesid');
        if (id !== null) return id;
        if (el.dataset.messageId) return el.dataset.messageId;
        if (el.dataset.id) return el.dataset.id;
        return el.id || null;
    }

    function processMessage(el) {
        const id = getMessageId(el);
        if (!id) return;

        const toggle = el.querySelector('.mes_button.extraMesButtonsHint');
        if (!toggle) return;

        // Find the dropdown container (the element with .dropdown class)
        const dropdown = toggle.closest('.dropdown');
        if (!dropdown) return;

        // Avoid attaching duplicate event listeners
        if (dropdown.dataset.deleteAfterHereProcessed === 'true') return;
        dropdown.dataset.deleteAfterHereProcessed = 'true';

        // When the dropdown opens, add our option
        dropdown.addEventListener('shown.bs.dropdown', function() {
            // Find the menu (could be .mes_buttons or .dropdown-menu)
            const menu = this.querySelector('.mes_buttons, .dropdown-menu');
            if (menu) {
                addDeleteOptionToMenu(menu, id);
            }
        });

        // When the dropdown closes, remove our option
        dropdown.addEventListener('hidden.bs.dropdown', function() {
            const menu = this.querySelector('.mes_buttons, .dropdown-menu');
            if (menu) {
                const item = menu.querySelector('.delete-after-here-item');
                if (item) item.remove();
            }
        });

        // If the dropdown is already open when the extension loads (rare), add now
        if (dropdown.classList.contains('show')) {
            const menu = dropdown.querySelector('.mes_buttons, .dropdown-menu');
            if (menu) {
                addDeleteOptionToMenu(menu, id);
            }
        }
    }

    function scan() {
        const container = document.querySelector('#chat');
        if (!container) return false;

        const msgs = container.querySelectorAll('.mes');
        if (!msgs.length) return false;

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
                console.log('✅ Delete After Here ready.');
            } else if (attempts >= 30) {
                clearInterval(interval);
                interval = null;
                console.error('❌ Failed to initialise.');
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