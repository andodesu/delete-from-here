(function() {
    'use strict';

    console.log('🚀 Delete After Here: Enhanced loader started.');

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

        // Try to find by ID; if not, maybe we have index?
        let index = chat.findIndex(msg => msg.id === messageId);
        if (index === -1 && typeof messageId === 'number') {
            // If messageId is a number, treat it as index (fallback)
            index = messageId;
            if (index < 0 || index >= chat.length) {
                console.error(`❌ Invalid index ${index}.`);
                return;
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
            const mesElement = menu.closest('.mes, [data-message-id]');
            if (mesElement) {
                const toggleBtn = mesElement.querySelector('.mes_button.extraMesButtonsHint, [data-toggle="dropdown"], .dropdown-toggle');
                if (toggleBtn) toggleBtn.click();
            }
        });

        menu.appendChild(item);
        console.log(`✅ Option added for message with ID: ${messageId}`);
        return true;
    }

    function getMessageId(messageElement) {
        // Try multiple ways to get the message ID
        // 1. data-message-id
        let id = messageElement.dataset.messageId;
        if (id !== undefined) return id;

        // 2. data-id
        id = messageElement.dataset.id;
        if (id !== undefined) return id;

        // 3. id attribute
        if (messageElement.id) {
            // Often it's like "mes_123"
            const match = messageElement.id.match(/mes[_-]?(\d+)/i);
            if (match) return match[1];
            return messageElement.id;
        }

        // 4. Look for a child with data-message-id
        const childWithId = messageElement.querySelector('[data-message-id]');
        if (childWithId) return childWithId.dataset.messageId;

        // 5. Look for a child with data-id
        const childWithDataId = messageElement.querySelector('[data-id]');
        if (childWithDataId) return childWithDataId.dataset.id;

        // 6. If all fails, log the element and return null
        console.warn('Could not extract message ID from element:', messageElement);
        return null;
    }

    function processMessage(messageElement) {
        const messageId = getMessageId(messageElement);
        if (!messageId) {
            console.warn('⚠️ Skipping message: no ID found.');
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
                    // Try to find any visible mes_buttons
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

        const selectors = ['.mes', '.message', '[data-message-id]', '.msg'];
        let found = false;
        for (const sel of selectors) {
            const msgs = chatContainer.querySelectorAll(sel);
            if (msgs.length > 0) {
                console.log(`✅ Found ${msgs.length} messages using selector "${sel}"`);
                // Log first message's outerHTML for debugging (only if more than 0)
                if (msgs.length > 0) {
                    console.log('🔍 Sample message HTML:', msgs[0].outerHTML.substring(0, 500));
                }
                msgs.forEach(processMessage);
                found = true;
                break;
            }
        }
        if (!found) {
            console.warn('⚠️ No messages found. Container HTML preview:');
            console.log(chatContainer.innerHTML.substring(0, 800));
            return false;
        }

        // MutationObserver
        const observer = new MutationObserver(() => {
            for (const sel of selectors) {
                const msgs = chatContainer.querySelectorAll(sel);
                msgs.forEach(msg => {
                    const toggle = msg.querySelector('.mes_button.extraMesButtonsHint, [data-toggle="dropdown"], .dropdown-toggle');
                    if (toggle && !toggle.dataset.deleteAfterHereHook) {
                        processMessage(msg);
                    }
                });
                break;
            }
        });
        observer.observe(chatContainer, { childList: true, subtree: true });
        console.log('👀 MutationObserver running.');
        return true;
    }

    // Retry mechanism
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