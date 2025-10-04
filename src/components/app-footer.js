class AppFooter extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: var(--blue);
          color: var(--white);
          text-align: center;
          padding: 1rem;
          font-size: 0.9rem;
          letter-spacing: 0.5px;
          box-shadow: 0 -2px 6px rgba(0, 0, 0, 0.1);
          transition: background 0.3s ease;
          user-select: none;
        }
        :host(:hover) {
          background: color-mix(in srgb, var(--blue) 90%, #000);
        }
      </style>
      <slot>&copy; 2023 My Notes App. Dibuat dengan ❤️ dan IndexedDB.</slot>
    `;
  }
}

customElements.define('app-footer', AppFooter);