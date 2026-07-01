(function() {
    'use strict';

    console.log('🚀 Delete After Here: Debug version.');

    function getContext() {
        return window.SillyTavern ? SillyTavern.getContext() : null;
    }

    async function deleteAfter(messageId) {
        // ... same as before (I'll omit for brevity, but keep it) ...
    }

    function injectScissor(container, messageId) {
        if (!container) {
            console.warn('❌ injectScissor: container is null');
            return;
        }
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
        icon.style.fontSize = '0.9em';
        icon.style.transform = 'translateY(-1px)';
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
        console.log(`✅ Scissor injected for message ${messageId}`);
    }

    function getMessageId(el) {
        const id = el.getAttribute('mesid');
        if (id !== null) return id;
        if (el.dataset.messageId) return el.dataset.messageId;
        if (el.dataset.id) return el.dataset.id;
        return el.id || null;
    }

    function setupDelegation() {
        const container = document.querySelector('#chat');
        if (!container) {
            console.warn('❌ #chat not found');
            return false;
        }
        if (container.dataset.deleteAfterHereDelegated) {
            console.log('ℹ️ Delegation already set up');
            return true;
        }
        container.dataset.deleteAfterHereDelegated = 'true';

        container.addEventListener('click', function(e) {
            const toggle = e.target.closest('.mes_button.extraMesButtonsHint');
            if (!toggle) {
                // Uncomment to see every click (might be spammy)
                // console.log('ℹ️ Click not on toggle');
                return;
            }
            console.log('🔍 Toggle clicked!');

            const mes = toggle.closest('.mes');
            if (!mes) {
                console.warn('❌ No .mes parent found');
                return;
            }
            const id = getMessageId(mes);
            if (!id) {
                console.warn('❌ No message ID found');
                return;
            }
            console.log(`🔍 Message ID: ${id}`);

            const menu = mes.querySelector('.extraMesButtons');
            if (!menu) {
                console.warn('❌ .extraMesButtons not found in .mes');
                return;
            }
            console.log('🔍 .extraMesButtons found, waiting 50ms...');

            setTimeout(() => {
                // Check visibility
                const isVisible = menu.offsetParent !== null;
                console.log(`🔍 Menu visible? ${isVisible}`);
                if (isVisible) {
                    injectScissor(menu, id);
                } else {
                    console.warn('⚠️ Menu not visible, skipping injection');
                }
            }, 50);
        });

        console.log('✅ Event delegation set up');
        return true;
    }

    function scanExisting() {
        const container = document.querySelector('#chat');
        if (!container) return false;
        console.log('🔍 Scanning for already-open menus...');

        container.querySelectorAll('.extraMesButtons').forEach(menu => {
            const isVisible = menu.offsetParent !== null;
            if (isVisible) {
                const mes = menu.closest('.mes');
                if (mes) {
                    const id = getMessageId(mes);
                    if (id) {
                        console.log(`🔍 Found visible menu for message ${id}, injecting...`);
                        injectScissor(menu, id);
                    }
                }
            }
        });
        return true;
    }

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