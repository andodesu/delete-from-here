(function() {
    'use strict';

    console.log('🚀 Delete After Here: Debug with extended logging.');

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
            if (!toggle) return;
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
            console.log('🔍 .extraMesButtons found, waiting 300ms...');

            setTimeout(() => {
                // Detailed visibility check
                const styleDisplay = menu.style.display || 'not set';
                const hasHidden = menu.hasAttribute('hidden');
                const offsetParent = menu.offsetParent;
                const parentDropdown = menu.closest('.dropdown');
                const parentClasses = parentDropdown ? parentDropdown.className : 'no dropdown parent';

                console.log('📊 Visibility details:');
                console.log('  - style.display:', styleDisplay);
                console.log('  - hasAttribute("hidden"):', hasHidden);
                console.log('  - offsetParent:', offsetParent);
                console.log('  - parent .dropdown classes:', parentClasses);
                console.log('  - menu itself classes:', menu.className);

                const isVisible = offsetParent !== null && !hasHidden && styleDisplay !== 'none';
                console.log(`🔍 Menu visible? ${isVisible}`);

                if (isVisible) {
                    injectScissor(menu, id);
                } else {
                    console.warn('⚠️ Menu not visible, skipping injection');
                }
            }, 75);
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