(function() {
    'use strict';

    console.log('🚀 Delete After Here: Final version with mesid support.');

    function getContext() {
        return window.SillyTavern ? SillyTavern.getContext() : null;
    }

    function deleteAfter(messageId) {
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

        // Try to find by ID (could be string or number)
        let index = chat.findIndex(msg => String(msg.id) === String(messageId));
        if (index === -1) {
            // Fallback: try to parse as index
            const idx = parseInt(messageId);
            if (!isNaN(idx) && idx >= 0 && idx < chat.length) {
                index = idx;
            }
        }
        if (index === -1) {
            console.error(`❌ Message ID ${messageId} not found in chat array.`);
            return;
        }

        const count = chat.length - index - 1;
        if (!confirm(`Delete this message and ${count} message${count !== 1 ? 's' : ''} after it?`)) return;

        chat.splice(index);

        if (typeof context.saveChat === 'function') context.saveChat();
        else if (typeof context.setChat === 'function') context.setChat(chat);

        if (typeof context.refreshMessages === 'function') context.refreshMessages();
        else if (typeof context.loadChat === 'function') context.loadChat();

        if (typeof context.toast === 'function') context.toast('Deleted messages.', 'info');
        console.log('✅ Deletion complete.');
    }

    function addDeleteOptionToMenu(menu, messageId) {
        if (!menu) {
            console.warn('⚠️ Menu is null.');
            return false;
        }
        if (menu.querySelector('.delete-after-here-item')) {
            return false;
        }

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
        console.log(`✅ Option added for message ID: ${messageId}`);
        return true;
    }

    function getMessageId(messageElement) {
        // Use the mesid attribute directly
        const mesId = messageElement.getAttribute('mesid');
        if (mesId !== null) return mesId;

        // Fallbacks
        if (messageElement.dataset.messageId) return messageElement.dataset.messageId;
        if (messageElement.dataset.id) return messageElement.dataset.id;
        if (messageElement.id) return messageElement.id;
        return null;
    }

    function processMessage(messageElement) {
        const messageId = getMessageId(messageElement);
        if (messageId === null) {
            console.warn('⚠️ Skipping message: no mesid found.');
            return;
        }

        // Find the three-dots button
        let toggleBtn = messageElement.querySelector('.mes_button.extraMesButtonsHint');
        if (!toggleBtn) {
            toggleBtn = messageElement.querySelector('[data-toggle="dropdown"]');
        }
        if (!toggleBtn) {
            toggleBtn = messageElement.querySelector('.dropdown-toggle');
        }
        if (!toggleBtn) {
            console.warn(`⚠️ No toggle button for message ${messageId}`);
            return;
        }

        if (toggleBtn.dataset.deleteAfterHereHook === 'true') return;
        toggleBtn.dataset.deleteAfterHereHook = 'true';

        toggleBtn.addEventListener('click', function() {
            setTimeout(() => {
                let menu = messageElement.querySelector('.mes_buttons');
                if (!menu) {
                    // Try to find any visible mes_buttons (maybe it's a sibling or elsewhere)
                    menu = document.querySelector('.mes_buttons:not(.delete-after-here-item)');
                }
                if (menu) {
                    addDeleteOptionToMenu(menu, messageId);
                } else {
                    console.warn(`⚠️ .mes_buttons not found for message ${messageId}`);
                }
            }, 200);
        });

        console.log(`✅ Toggle hooked for message ID: ${messageId}`);
    }

    function scanAndProcess() {
        const containers = ['#chat', '#messages', '.chat-container', '.message-container'];
        let chatContainer = null;
        for (const sel of containers) {
            const el = document.querySelector(sel);
            if (el) {
                chatContainer = el;
                console.log(`✅ Found container: ${sel}`);
                break;
            }
        }
        if (!chatContainer) {
            console.warn('❌ No chat container found.');
            return false;
        }

        // Use .mes as primary selector
        const msgs = chatContainer.querySelectorAll('.mes');
        if (msgs.length === 0) {
            console.warn('⚠️ No .mes elements found.');
            return false;
        }

        console.log(`✅ Found ${msgs.length} messages.`);
        msgs.forEach(processMessage);

        // MutationObserver for new messages
        const observer = new MutationObserver(() => {
            chatContainer.querySelectorAll('.mes').forEach(msg => {
                const toggle = msg.querySelector('.mes_button.extraMesButtonsHint');
                if (toggle && !toggle.dataset.deleteAfterHereHook) {
                    processMessage(msg);
                }
            });
        });
        observer.observe(chatContainer, { childList: true, subtree: true });
        console.log('👀 MutationObserver running.');
        return true;
    }

    // Retry until messages appear (just in case they load late)
    let attempts = 0;
    const maxAttempts = 30;
    let intervalId = null;

    function init() {
        if (intervalId) clearInterval(intervalId);
        intervalId = setInterval(() => {
            attempts++;
            const success = scanAndProcess();
            if (success) {
                console.log(`✅ Scan succeeded on attempt ${attempts}.`);
                clearInterval(intervalId);
                intervalId = null;
            } else if (attempts >= maxAttempts) {
                console.error(`❌ Failed after ${maxAttempts} attempts.`);
                clearInterval(intervalId);
                intervalId = null;
            } else {
                console.log(`⏳ Attempt ${attempts}/${maxAttempts}...`);
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