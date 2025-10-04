class LoadingIndicator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: none;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1000;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        :host(.active) {
          display: block;
          opacity: 1;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid var(--blue);
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
      <div class="spinner"></div>
    `;
  }
}

customElements.define('loading-indicator', LoadingIndicator);