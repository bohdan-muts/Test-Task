if (!customElements.get('best-sellers-section')) {
  customElements.define('best-sellers-section',
    class extends HTMLElement {
      constructor() {
        super();
        this.isLoading = false;
        this.handleUserInteraction = this.handleUserInteraction.bind(this);
        this.handleTabSelection = this.handleTabSelection.bind(this);
        this.handleAddToCartRequest = this.handleAddToCartRequest.bind(this);
        this.handlePopupOpening = this.handlePopupOpening.bind(this);
        this.closeNotificationPopup = this.closeNotificationPopup.bind(this);
      }

      connectedCallback() {
        this.addEventListener('click', this.handleUserInteraction);
      }

      handleUserInteraction(event) {
        const tabTrigger = event.target.closest('[data-js-trigger]');
        if (tabTrigger) return this.handleTabSelection(tabTrigger);

        const addToCartButton = event.target.closest('[data-js-add-to-cart]');
        if (addToCartButton) return this.handleAddToCartRequest(addToCartButton);

        const openPopupTrigger = event.target.closest('[data-js-open-popup]');
        if (openPopupTrigger) return this.handlePopupOpening(openPopupTrigger);

        const closePopupTrigger = event.target.closest('[data-js-popup-close]');
        if (closePopupTrigger) return this.closeNotificationPopup();

        if (event.target.hasAttribute('data-js-popup')) {
          this.closeNotificationPopup();
        }
      }

      handleTabSelection(triggerElement) {
        const wrapperElement = triggerElement.closest('.best-sellers__wrapper');
        if (!wrapperElement) return;

        wrapperElement.querySelectorAll('[data-js-trigger]').forEach((tab) => tab.classList.remove('is-active'));
        wrapperElement.querySelectorAll('[data-js-id]').forEach((block) => block.classList.remove('is-active'));

        triggerElement.classList.add('is-active');
        wrapperElement.querySelector(`[data-js-id="${triggerElement.dataset.jsTrigger}"]`)?.classList.add('is-active');
      }

      async handleAddToCartRequest(buttonElement) {
        if (this.isLoading) return;

        const productVariantId = buttonElement.dataset.variantId;
        if (!productVariantId) return;

        try {
          this.isLoading = true;
          buttonElement.setAttribute('disabled', 'disabled');
          
          const formData = new FormData();
          formData.append('id', productVariantId);
          formData.append('quantity', 1);

          const cartComponent = document.querySelector('cart-drawer') || document.querySelector('cart-notification');

          if (cartComponent) {
            formData.append('sections', cartComponent.getSectionsToRender().map((section) => section.id));
            formData.append('sections_url', window.location.pathname);
            cartComponent.setActiveElement?.(document.activeElement);
          }

          const fetchConfiguration = fetchConfig('javascript');
          fetchConfiguration.headers['X-Requested-With'] = 'XMLHttpRequest';
          delete fetchConfiguration.headers['Content-Type'];
          fetchConfiguration.body = formData;

          const response = await fetch(routes.cart_add_url, fetchConfiguration);
          const cartData = await response.json();

          if (cartData?.status) throw new Error(cartData.description);

          if (cartComponent && typeof cartComponent.renderContents === 'function') {
            cartComponent.renderContents(cartData);
          }

          if (typeof publish !== 'undefined') {
            publish(PUB_SUB_EVENTS.cartUpdate, {
              source: 'best-sellers',
              productVariantId: productVariantId,
              cartData: cartData
            });
          }
        } catch (error) {
          console.error('Add to cart failed:', error);
        } finally {
          this.isLoading = false;
          buttonElement.removeAttribute('disabled');
        }
      }

      handlePopupOpening(triggerElement) {
        const popupElement = this.querySelector('[data-js-popup]');
        const popupTextElement = this.querySelector('[data-js-popup-text]');

        if (popupElement && popupTextElement) {
          const template = popupElement.dataset.messageTemplate;
          const productName = triggerElement.dataset.productName;
          
          popupTextElement.textContent = template.replace('[PRODUCT_NAME]', productName);
        }

        popupElement?.classList.add('is-open');
        document.body.classList.add('overflow-hidden');
      }

      closeNotificationPopup() {
        this.querySelector('[data-js-popup]')?.classList.remove('is-open');
        document.body.classList.remove('overflow-hidden');
      }
    }
  );
}