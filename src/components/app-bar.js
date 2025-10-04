class AppBar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        /* CSS sudah di global, jadi kosong atau override jika perlu */
      </style>
      <slot></slot>  <!-- Isi dari HTML: "My Notes App" -->
    `;
  }
}
customElements.define('app-bar', AppBar);