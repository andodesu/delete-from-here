module.exports = {
    async init(context) {
        // Register a new action in the message dropdown
        context.messageActions.push({
            // Unique identifier for this action
            id: 'delete-after-here',
            // Label shown on hover
            label: 'Delete all after this message',
            // Font Awesome icon (optional)
            icon: 'fa-trash-can',
            // The function called when the action is clicked
            action: (messageId) => {
                // Get the current chat array
                const chat = context.chat;
                // Find the index of the clicked message by its ID
                const index = chat.findIndex(msg => msg.id === messageId);
                if (index === -1) {
                    console.warn('Delete After Here: message not found');
                    return;
                }

                // Remove this message and everything after it
                chat.splice(index);

                // Save the updated chat
                context.saveChat();

                // Refresh the message display
                context.refreshMessages();

                // Optional: show a quick confirmation toast
                context.toast('Deleted message and all following messages.', 'info');
            }
        });
    }
};