/**
 * Global modal behavior: Escape to close, click outside (overlay) to close.
 * Run on every page that uses .modal-overlay.
 */
(function () {
  function getVisibleOverlays() {
    return Array.from(document.querySelectorAll('.modal-overlay:not(.hidden)'));
  }

  function isBlocking(overlay) {
    return overlay && overlay.dataset && overlay.dataset.modalBlocking === 'true';
  }

  function closeTopModal() {
    const visible = getVisibleOverlays();
    if (visible.length === 0) return;
    const top = visible[visible.length - 1];
    if (isBlocking(top)) return;
    top.classList.add('hidden');
  }

  /**
   * Enable all input fields in a modal when it's opened
   * @param {HTMLElement} modal - The modal overlay element
   */
  function enableModalInputs(modal) {
    if (!modal) return;
    
    // Find all input fields, textareas, and selects within the modal
    const inputs = modal.querySelectorAll('input:not([type="hidden"]):not([data-keep-readonly]), textarea:not([data-keep-readonly]), select:not([data-keep-readonly])');
    
    inputs.forEach((input) => {
      // Skip if input has data-keep-readonly attribute (intentionally readonly)
      if (input.hasAttribute('data-keep-readonly')) {
        return;
      }
      
      // Remove readonly attribute
      input.removeAttribute('readonly');
      
      // Enable the input (remove disabled attribute)
      input.disabled = false;
      
      // Remove tabindex restrictions if present (unless it's intentionally set)
      if (input.hasAttribute('tabindex') && input.getAttribute('tabindex') === '-1' && !input.hasAttribute('data-keep-tabindex')) {
        input.removeAttribute('tabindex');
      }
    });
  }

  /**
   * Observer to watch for modal visibility changes
   */
  function observeModalChanges() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const modal = mutation.target;
          if (modal.classList.contains('modal-overlay')) {
            // If modal is now visible (not hidden)
            if (!modal.classList.contains('hidden')) {
              // Small delay to ensure DOM is ready
              setTimeout(() => {
                enableModalInputs(modal);
              }, 10);
            }
          }
        }
      });
    });

    // Observe all existing modals
    document.querySelectorAll('.modal-overlay').forEach((modal) => {
      observer.observe(modal, {
        attributes: true,
        attributeFilter: ['class']
      });
    });

    // Also observe dynamically added modals
    const bodyObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            if (node.classList && node.classList.contains('modal-overlay')) {
              observer.observe(node, {
                attributes: true,
                attributeFilter: ['class']
              });
              // If it's already visible, enable inputs immediately
              if (!node.classList.contains('hidden')) {
                setTimeout(() => {
                  enableModalInputs(node);
                }, 10);
              }
            }
            // Check for modals within added nodes
            const modals = node.querySelectorAll && node.querySelectorAll('.modal-overlay');
            if (modals) {
              modals.forEach((modal) => {
                observer.observe(modal, {
                  attributes: true,
                  attributeFilter: ['class']
                });
                if (!modal.classList.contains('hidden')) {
                  setTimeout(() => {
                    enableModalInputs(modal);
                  }, 10);
                }
              });
            }
          }
        });
      });
    });

    bodyObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  function onKeyDown(e) {
    if (e.key !== 'Escape') return;
    const visible = getVisibleOverlays();
    if (visible.length === 0) return;
    const top = visible[visible.length - 1];
    if (isBlocking(top)) return;
    e.preventDefault();
    closeTopModal();
  }

  function onClick(e) {
    if (!e.target || !e.target.closest) return;
    const overlay = e.target.closest('.modal-overlay');
    if (!overlay || overlay.classList.contains('hidden')) return;
    if (e.target !== overlay) return;
    if (isBlocking(overlay)) return;
    e.preventDefault();
    e.stopPropagation();
    overlay.classList.add('hidden');
  }

  // Initialize modal input enabler
  observeModalChanges();

  // Also enable inputs when modals are opened programmatically
  // Override common methods that show modals
  const originalRemove = Element.prototype.remove;
  Element.prototype.remove = function() {
    if (this.classList && this.classList.contains('modal-overlay') && !this.classList.contains('hidden')) {
      enableModalInputs(this);
    }
    return originalRemove.apply(this, arguments);
  };

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('click', onClick, true);
})();
