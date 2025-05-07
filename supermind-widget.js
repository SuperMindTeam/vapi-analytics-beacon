class SupermindAIWidget extends HTMLElement {
  constructor() {
    super();
    this.agentId = this.getAttribute("877006ae-b97c-43a9-9086-5e95409aefd1");
    this.shadow = this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.shadow.innerHTML = `
      <style>
        .widget-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #121212;
          border-radius: 100px;
          padding: 12px;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .widget-container:hover {
          transform: scale(1.05);
        }

        .mic-icon {
          width: 28px;
          height: 28px;
          fill: #ffffff;
        }

        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
          }
        }

        .listening {
          animation: pulse 2s infinite;
        }
      </style>

      <div class="widget-container" id="voice-button" title="Talk to AI">
        <svg class="mic-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zm-5 9a9 9 0 0 0 9-9h-2a7 7 0 0 1-14 0H3a9 9 0 0 0 9 9z"/>
        </svg>
      </div>
    `;

    this.attachListeners();
  }

  attachListeners() {
    const button = this.shadow.getElementById("voice-button");
    let vapiInstance = null;
    let isListening = false;

    button.addEventListener("click", async () => {
      if (!vapiInstance) {
        const { Vapi } = await import("https://cdn.jsdelivr.net/npm/@vapi-ai/web");

        vapiInstance = new Vapi({
          apiKey: "bb623861-73db-4dba-8ee2-d5dd24098849", 
        });

        vapiInstance.on("end", () => {
          isListening = false;
          button.classList.remove("listening");
        });
      }

      if (!isListening) {
        isListening = true;
        button.classList.add("listening");

        vapiInstance.startConversation({
          agentId: this.agentId,
        });
      } else {
        isListening = false;
        vapiInstance.stopConversation();
        button.classList.remove("listening");
      }
    });
  }
}

customElements.define("supermind-ai", SupermindAIWidget);
