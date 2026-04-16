
<script lang="ts">
  import { ApiClient } from 'vtubestudio';
  import { KisekaeEngine } from './kisekae-engine';

  let vts: ApiClient;
  let engine: KisekaeEngine;
  
  let isConnected = false;
  let isConnecting = false;
  let isSynced = false;
  let statusMessage = "SYSTEM READY";

  const STORAGE_KEY = "VTS_AUTH_TOKEN";

  async function connectToVts() {
    isConnecting = true;
    statusMessage = "CONNECTING TO VTS...";

    vts = new ApiClient({
      authTokenGetter: () => localStorage.getItem(STORAGE_KEY),
      authTokenSetter: async (t) => { localStorage.setItem(STORAGE_KEY, t); },
      pluginName: "Ham's Kisekae System",
      pluginDeveloper: "Ham",
    });

    vts.on('connect', () => {
      isConnected = true;
      isConnecting = false;
      engine = new KisekaeEngine(vts);
      statusMessage = "VTS CONNECTED";
    });

    vts.on('error', (err: unknown) => {
      isConnecting = false;
      isConnected = false;
      statusMessage = "ERROR: " + (err instanceof Error ? err.message : "FAILED");
    });

    vts.on('disconnect', () => {
      isConnecting = false;
      isConnected = false;
      isSynced = false;
      if (engine) engine.stop();
      statusMessage = "DISCONNECTED";
    });
  }

  function toggleSync() {
    if (!engine) return;
    isSynced = !isSynced;
    if (isSynced) {
      engine.start();
      statusMessage = "SYNCHRONIZING...";
    } else {
      engine.stop();
      statusMessage = "SYNC PAUSED";
    }
  }

  function disconnectVts() {
    if (vts) vts.disconnect();
  }
</script>

<main>
  <div class="app-card">
    
    <header>
      <h1>HAM'S KISEKAE</h1>
    </header>
    
    <div class="status-display" class:isSynced>
      {statusMessage}
    </div>

    <div class="controls">
      {#if !isConnected}
        <button 
          class="main-action-btn" 
          disabled={isConnecting} 
          on:click={connectToVts}
        >
          {isConnecting ? 'CONNECTING...' : 'CONNECT TO VTS'}
        </button>
      {:else}
        <div class="toggle-section">
          <span class="label">ENABLE SYNC</span>
          <label class="switch">
            <input type="checkbox" checked={isSynced} on:change={toggleSync}>
            <span class="slider"></span>
          </label>
        </div>

        <button class="text-btn" on:click={disconnectVts}>
          DISCONNECT API
        </button>
      {/if}
    </div>
  </div>
 
  <div class="footer">
    <a href="https://twitter.com/hamsterCrumbs" target="_blank" rel="noopener noreferrer" class="social-link">
      @HAMSTERCRUMBS
    </a>
  </div>
</main>

<style>
  @import url('https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&display=swap');

  :global(body) {
    background-color: #2d2a32; 
    background-image: radial-gradient(circle at 50% 50%, #3d3846 0%, #2d2a32 100%);
    color: #e0d9e5;
    font-family: 'Pixelify Sans', cursive; /* Explicit fallback */
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100vw;
    min-height: 100vh;
    overflow-x: hidden;
  }

  main {
    margin-top: 10vh; 
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .app-card {
    background: #3a3541;
    padding: 2rem;
    border-radius: 0; 
    box-shadow: 10px 10px 0px rgba(0,0,0,0.3);
    width: 320px;
    text-align: center;
    border: 3px solid #4a4453;
  }

  header {
    margin-bottom: 1.5rem;
  }

  h1 {
    /* Explicitly setting font-family here to override browser defaults */
    font-family: 'Pixelify Sans', cursive;
    font-weight: 700;
    font-size: 1.4rem;
    margin: 0;
    color: #ffb1b1;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .status-display {
    font-family: 'Pixelify Sans', cursive;
    background: #252229;
    padding: 0.75rem;
    margin-bottom: 1.5rem;
    border: 2px solid #1a181d;
    font-size: 0.9rem;
    letter-spacing: 1px;
    min-height: 1.2rem;
  }

  .status-display.isSynced {
    border-color: #78e08f;
    color: #78e08f;
  }

  .main-action-btn {
    width: 100%;
    padding: 1rem;
    border: none;
    background: #ffb1b1;
    color: #4a2b2b;
    font-family: 'Pixelify Sans', cursive;
    font-weight: 700;
    font-size: 1.1rem;
    cursor: pointer;
    box-shadow: 4px 4px 0 #d68e8e;
    transition: transform 0.1s, box-shadow 0.1s;
  }

  .main-action-btn:active {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 #d68e8e;
  }

  .toggle-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.5rem;
    margin-bottom: 1.5rem;
  }

  .label {
    font-family: 'Pixelify Sans', cursive;
    font-size: 0.9rem;
    color: #b3abbd;
  }

  .switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 24px;
  }

  .switch input { opacity: 0; width: 0; height: 0; }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0; left: 0; right: 0; bottom: 0;
    background-color: #252229;
    border: 2px solid #4a4453;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 16px; width: 16px;
    left: 2px; bottom: 2px;
    background-color: #4a4453;
  }

  input:checked + .slider { background-color: #78e08f; border-color: #55a666; }
  input:checked + .slider:before {
    transform: translateX(26px);
    background-color: #252229;
  }

  .text-btn {
    background: none;
    border: none;
    color: #8a8393;
    font-family: 'Pixelify Sans', cursive;
    font-size: 0.8rem;
    cursor: pointer;
    text-decoration: underline;
    text-transform: uppercase;
    margin-top: 1rem;
  }

  .footer { 
    margin-top: 2rem;
    padding-bottom: 2rem;
  }

  .social-link {
    font-family: 'Pixelify Sans', cursive;
    color: #6a6473;
    text-decoration: none;
    font-size: 0.8rem;
  }
</style>