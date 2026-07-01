(function() {
    'use strict';

    console.log('🚀 Delete After Here: Robust one-shot observer.');

    function getContext() {
        return window.SillyTavern ? SillyTavern.getContext() : null;
    }

    // --- Deletion logic (unchanged) ---
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
                if (!isNaN(idNum) && idNum >= currentIdNum) idsToDelete.push(idNum);
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

    // --- Inject scissor (with your custom styling) ---
    function injectScissor(container, messageId) {
        if (!container) return;
        const existing = container.querySelector('.delete-after-here-item');
        if (existing) existing.remove();

        const item = document.createElement('div');
        item.className = 'delete-after-here-item mes_button';
        item.style.cursor = 'pointer';
        item.title = 'Delete all after this message';
        item.setAttribute('role', 'button');
        item.setAttribute('tabindex', '0');

        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-scissors fa-fw';
        icon.style.fontSize = '0.95em';
        icon.style.transform = 'translateY(-3px)';
        icon.style.display = 'inline-block';
        item.appendChild(icon);

        item.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteAfter(messageId);
            const mes = container.closest('.mes');
            if (mes) {
                const toggle = mes.querySelector('.mes_button.extraMesButtonsHint');
                if (toggle) toggle.click();
            }
        });

        container.appendChild(item);
    }

    function getMessageId(el) {
        const id = el.getAttribute('mesid');
        if (id !== null) return id;
        if (el.dataset.messageId) return el.dataset.messageId;
        if (el.dataset.id) return el.dataset.id;
        return el.id || null;
    }

    // --- Event delegation with one-shot observer ---
    function setupDelegation() {
        const container = document.querySelector('#chat');
        if (!container) return false;
        if (container.dataset.deleteAfterHereDelegated) return true;
        container.dataset.deleteAfterHereDelegated = 'true';

        container.addEventListener('click', function(e) {
            const toggle = e.target.closest('.mes_button.extraMesButtonsHint');
            if (!toggle) return;

            const mes = toggle.closest('.mes');
            if (!mes) return;
            const id = getMessageId(mes);
            if (!id) return;
            const menu = mes.querySelector('.extraMesButtons');
            if (!menu) return;

            // --- One-shot observer for visibility ---
            let observer = new MutationObserver(() => {
                const isVisible = (
                    menu.offsetParent !== null &&
                    menu.style.display !== 'none' &&
                    !menu.hasAttribute('hidden')
                );
                if (isVisible) {
                    injectScissor(menu, id);
                    observer.disconnect();
                    if (dropdownObserver) dropdownObserver.disconnect();
                }
            });

            // Observe menu attributes
            observer.observe(menu, {
                attributes: true,
                attributeFilter: ['style', 'hidden', 'class'],
                attributeOldValue: false
            });

            // Also observe parent dropdown class changes
            let dropdownObserver = null;
            const dropdown = menu.closest('.dropdown');
            if (dropdown) {
                dropdownObserver = new MutationObserver(() => {
                    const isVisible = (
                        menu.offsetParent !== null &&
                        menu.style.display !== 'none' &&
                        !menu.hasAttribute('hidden')
                    );
                    if (isVisible) {
                        injectScissor(menu, id);
                        observer.disconnect();
                        dropdownObserver.disconnect();
                    }
                });
                dropdownObserver.observe(dropdown, {
                    attributes: true,
                    attributeFilter: ['class'],
                    attributeOldValue: false
                });
            }

            // Check if already visible (edge case)
            if (menu.offsetParent !== null && menu.style.display !== 'none' && !menu.hasAttribute('hidden')) {
                injectScissor(menu, id);
                observer.disconnect();
                if (dropdownObserver) dropdownObserver.disconnect();
            }

            // Safety cleanup after 5s (prevents leaks)
            setTimeout(() => {
                if (observer) observer.disconnect();
                if (dropdownObserver) dropdownObserver.disconnect();
            }, 5000);
        });

        return true;
    }

    // --- Scan existing open menus on load ---
    function scanExisting() {
        const container = document.querySelector('#chat');
        if (!container) return false;

        container.querySelectorAll('.extraMesButtons').forEach(menu => {
            const isVisible = (
                menu.offsetParent !== null &&
                menu.style.display !== 'none' &&
                !menu.hasAttribute('hidden')
            );
            if (isVisible) {
                const mes = menu.closest('.mes');
                if (mes) {
                    const id = getMessageId(mes);
                    if (id) injectScissor(menu, id);
                }
            }
        });
        return true;
    }

    // --- Initialisation ---
    let attempts = 0, interval;
    function init() {
        if (interval) clearInterval(interval);
        interval = setInterval(() => {
            attempts++;
            const ok = setupDelegation() && scanExisting();
            if (ok) {
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