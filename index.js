// index.js for DeleteFromHere-Menu extension

const extensionName = "DeleteFromHere-Menu";

// Wait for SillyTavern to be fully loaded
(async () => {
    // Load required modules
    const { saveChatConditional } = await import("../../../../../script.js");
    const { event_types, eventSource } = await import("../../../../../script.js");
    const { getContext } = await import("../../../../extensions.js");

    /**
     * Delete messages from given index to end of chat
     */
    async function deleteFromHere(messageId) {
        const context = getContext();
        const chat = context.chat;
        
        if (!chat || !Array.isArray(chat) || chat.length === 0) {
            toastr.warning('No messages to delete');
            return;
        }

        // Find message index by ID
        const messageIndex = chat.findIndex(m => String(m.mesid) === String(messageId));
        
        if (messageIndex === -1) {
            toastr.error('Message not found in chat');
            return;
        }

        const deletedCount = chat.length - messageIndex;
        const messagePreview = chat[messageIndex]?.mes?.substring(0, 100) || '[message]';
        
        // Confirmation dialog
        const confirmMessage = `Delete from this message onward?\n\n` +
            `"${messagePreview}${chat[messageIndex]?.mes?.length > 100 ? '...' : ''}"\n\n` +
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
     * Add delete button to message action menus
     */
    function addDeleteButton() {
        // Add CSS for the button
        if (!document.getElementById('deleteFromHereStyles')) {
            const style = document.createElement('style');
            style.id = 'deleteFromHereStyles';
            style.textContent = `
                .delete_from_here_menu_item {
                    color: #ff6b6b !important;
                }
                .delete_from_here_menu_item:hover {
                    background: rgba(255, 107, 107, 0.15) !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Find all message action menus and add button
        $('.mes_buttons, .mes-edit-buttons').each(function() {
            const buttonContainer = $(this);
            
            // Skip if already added
            if (buttonContainer.find('.deleteFromHereBtn').length > 0) {
                return;
            }
            
            // Get message block and ID
            const messageBlock = buttonContainer.closest('.mes');
            if (!messageBlock.length) return;
            
            const messageId = messageBlock.attr('mesid');
            if (!messageId) return;
            
            // Create the button
            const deleteBtn = $(`
                <div class="deleteFromHereBtn interactable delete_from_here_menu_item" 
                     title="Delete this and all subsequent messages" 
                     data-mesid="${messageId}">
                    <i class="fa-solid fa-scissors"></i>
                    Delete from here
                </div>
            `);
            
            // Add click handler
            deleteBtn.on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                deleteFromHere($(this).data('mesid'));
            });
            
            // Add to container
            buttonContainer.append(deleteBtn);
        });
    }

    // Initialize extension
    function init() {
        // Initial button addition
        setTimeout(addDeleteButton, 1000);
        
        // Listen for chat changes
        eventSource.on(event_types.CHAT_CHANGED, () => {
            setTimeout(addDeleteButton, 200);
        });
        
        // Listen for new messages
        eventSource.on(event_types.MESSAGE_RECEIVED, () => {
            setTimeout(addDeleteButton, 200);
        });
        
        // Listen for message edits
        eventSource.on(event_types.MESSAGE_UPDATED, () => {
            setTimeout(addDeleteButton, 200);
        });
        
        // Listen for message swipes
        eventSource.on(event_types.MESSAGE_SWIPED, () => {
            setTimeout(addDeleteButton, 200);
        });
        
        console.log(`${extensionName}: Extension loaded successfully`);
    }

    // Start the extension
    init();
})();