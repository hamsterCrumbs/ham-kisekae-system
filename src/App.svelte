<script lang="ts">
  import { ApiClient } from 'vtubestudio';
  import { KisekaeEngine } from './kisekae-engine';

  let vts: ApiClient;
  let engine: KisekaeEngine;
  
  let isConnected = false;
  let isConnecting = false;
  let isSynced = false;
  let statusMessage = "Disconnected";

  const STORAGE_KEY = "VTS_AUTH_TOKEN";

  async function connectToVts() {
    isConnecting = true;
    statusMessage = "Attempting to connect to VTube Studio...";

    vts = new ApiClient({
      authTokenGetter: () => localStorage.getItem(STORAGE_KEY),
      authTokenSetter: async (t) => { localStorage.setItem(STORAGE_KEY, t); },
      pluginName: "Ham's Kisekae System",
      pluginDeveloper: "Ham",
    });

    // Success
    vts.on('connect', () => {
      isConnected = true;
      isConnecting = false;
      engine = new KisekaeEngine(vts);
      statusMessage = "Plugin Authorized & Connected";
    });

    // Failure/Disconnect
    vts.on('error', (err: unknown) => {
      isConnecting = false;
      isConnected = false;
      const errorMessage = err instanceof Error ? err.message : String(err);
      statusMessage = "Connection Error: " + errorMessage;
    });

    vts.on('disconnect', () => {
      isConnecting = false;
      isConnected = false;
      isSynced = false;
      if (engine) engine.stop();
      statusMessage = "Disconnected";
    });
  }

  function toggleSync() {
    if (!engine) return;
    isSynced = !isSynced;
    if (isSynced) {
      engine.start();
      statusMessage = "Synchronizing Parameters...";
    } else {
      engine.stop();
      statusMessage = "Sync Paused";
    }
  }

  function disconnectVts() {
    if (vts) vts.disconnect();
  }
</script>

<main>
  <div class="container">
    <h1>Ham's Kisekae</h1>
    
    <div class="status-box" class:connected={isConnected} class:syncing={isSynced}>
      {statusMessage}
    </div>

    <div class="button-group">
      {#if !isConnected}
        <button 
          class="btn connect-btn" 
          disabled={isConnecting} 
          on:click={connectToVts}
        >
          {isConnecting ? 'CONNECTING...' : 'CONNECT TO VTS'}
        </button>
      {:else}
        <button 
          class="btn sync-btn" 
          class:active={isSynced}
          on:click={toggleSync}
        >
          {isSynced ? 'STOP SYNC' : 'START SYNC'}
        </button>

        <button class="btn disconnect-btn" on:click={disconnectVts}>
          DISCONNECT API
        </button>
      {/if}
    </div>
  </div>
</main>

<style>

  .connect-btn:disabled {
    background: #444;
    color: #888;
    cursor: wait;
  }
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.6; }
    100% { opacity: 1; }
  }

  .connect-btn:disabled {
    animation: pulse 1.5s infinite ease-in-out;
  }
</style>