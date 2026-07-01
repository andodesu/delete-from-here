// extension-delete-from-here-menu.js
// Adds "Delete From Here" option to the message action menu

import { saveChatConditional } from "../../../../../script.js";
import { event_types, eventSource } from "../../../../../script.js";
import { getContext } from "../../../../extensions.js";

const extensionName = "Delete From Here - Menu";

/**
 * Delete messages from given index to end of chat
 */
async function deleteFromHere(messageIndex) {
    const context = getContext();
    const chat = context.chat;
    
    if (!chat || !Array.isArray(chat) || chat.length === 0) {
        toastr.warning('No messages to delete');
        return;
    }

    if (messageIndex < 0 || messageIndex >= chat.length) {
        toastr.error('Invalid message index');
        return;
    }

    const deletedCount = chat.length - messageIndex;
    const messageToDelete = chat[messageIndex];
    const messagePreview = typeof messageToDelete?.mes === 'string' 
        ? messageToDelete.mes.substring(0, 100) + (messageToDelete.mes.length > 100 ? '...' : '')
        : '[message]';

    // Confirmation dialog
    const confirmMessage = `Delete from this message onward?\n\n` +
        `"${messagePreview}"\n\n` +
        `This will remove ${deletedCount} message(s) total.\n` +
        `This action cannot be undone.`;

    if (!confirm(confirmMessage)) {
        return;
    }

    // Perform deletion
    chat.splice(messageIndex, deletedCount);
    
    // Save the chat
    await saveChatConditional();
    
    // Show notification
    toastr.success(`Deleted ${deletedCount} message(s)`);
    
    // Refresh UI
    eventSource.emit(event_types.CHAT_CHANGED);
}

/**
 * Intercept the message action menu rendering to add our option
 */
function patchMessageActions() {
    // Wait for the message actions to be available
    const checkForMenu = setInterval(() => {
        // Find message action menus
        $('.mes_buttons, .mes-edit-buttons').each(function() {
            const buttonContainer = $(this);
            
            // Check if we already added our button
            if (buttonContainer.find('.deleteFromHereBtn').length > 0) {
                return;
            }
            
            // Find the message block and its ID
            const messageBlock = buttonContainer.closest('.mes');
            if (messageBlock.length === 0) return;
            
            const messageId = messageBlock.attr('mesid');
            if (messageId === undefined) return;
            
            // Create our button styled to match the menu
            const deleteBtn = $(`
                <div class="deleteFromHereBtn interactable" 
                     title="Delete from here" 
                     data-mesid="${messageId}">
                    <i class="fa-solid fa-scissors"></i>
                    <span>Delete from here</span>
                </div>
            `);
            
            // Click handler
            deleteBtn.on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const mesId = $(this).data('mesid');
                deleteFromHere(parseInt(mesId));
                
                // Close the menu if it's open
                $('.mes_edit_popup, .mes-edit-popup').hide();
            });
            
            // Insert into the menu - after existing delete buttons if possible
            const existingDelete = buttonContainer.find('[data-action="delete"], .mes_btn_delete');
            if (existingDelete.length > 0) {
                existingDelete.after(deleteBtn);
            } else {
                buttonContainer.append(deleteBtn);
            }
        });
    }, 500);
    
    // Clean up interval after some time to prevent memory leaks
    setTimeout(() => clearInterval(checkForMenu), 10000);
}

/**
 * Monitor for new messages and re-patch
 */
function setupEventListeners() {
    // Re-patch when chat changes
    eventSource.on(event_types.CHAT_CHANGED, () => {
        setTimeout(patchMessageActions, 200);
    });
    
    // Re-patch when new messages are rendered
    eventSource.on(event_types.MESSAGE_RECEIVED, () => {
        setTimeout(patchMessageActions, 300);
    });
    
    // Re-patch when messages are edited or UI updates
    eventSource.on(event_types.MESSAGE_UPDATED, () => {
        setTimeout(patchMessageActions, 100);
    });
    
    // Watch for message swipe/regenerate
    eventSource.on(event_types.MESSAGE_SWIPED, () => {
        setTimeout(patchMessageActions, 100);
    });
}

// Initialize
jQuery(async () => {
    try {
        // Initial patch
        setTimeout(patchMessageActions, 1000);
        
        // Set up event listeners for dynamic updates
        setupEventListeners();
        
        console.log(`${extensionName}: Extension loaded successfully`);
    } catch (error) {
        console.error(`${extensionName}: Error loading extension:`, error);
    }
});