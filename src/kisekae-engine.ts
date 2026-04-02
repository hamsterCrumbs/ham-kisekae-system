import type { ApiClient } from 'vtubestudio';

export class KisekaeEngine {
  private vts: ApiClient;
  private isRunning: boolean = false;
  private worker: Worker | null = null;
  
  // Cache for event-driven updates
  private cachedHksItems: any[] = [];
  private lastFrameTime: number = 0;

  constructor(vtsClient: ApiClient) {
    this.vts = vtsClient;
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    await this.refreshCache();
    this.vts.events.modelLoaded.subscribe(this.refreshCache, {});
    this.vts.events.item.subscribe(this.refreshCache, {});

    this.startWorker();
  }

  private startWorker() {
    // This string is a tiny script that runs in a separate background thread
    const workerCode = `
      let timer = null;
      self.onmessage = (e) => {
        if (e.data === 'start') {
          timer = setInterval(() => self.postMessage('tick'), 16); // ~60fps
        } else if (e.data === 'stop') {
          clearInterval(timer);
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));

    this.worker.onmessage = () => {
      this.syncFrame(); // This runs even if the tab is hidden!
    };

    this.worker.postMessage('start');
  }

  public stop() {
    this.isRunning = false;
    this.worker?.postMessage('stop');
    this.worker?.terminate();
    this.vts.events.modelLoaded.unsubscribe();
    this.vts.events.item.unsubscribe();
  }

  private syncFrame = async () => {
    if (!this.isRunning || !this.vts) return;

    try {
      // Gather data in parallel [cite: 148]
      const [model, paramList] = await Promise.all([
        this.vts.currentModel(),
        this.vts.live2DParameterList()
      ]);

      if (model.modelLoaded) {
        const { positionX, positionY, size, rotation } = model.modelPosition;
        const syncTasks: Promise<any>[] = [];

        //add fps counter
        const now = performance.now();
        const fps = Math.round(1000 / (now - this.lastFrameTime));
        this.lastFrameTime = now;
        
        console.log(`FPS: ${fps}`);

        // 1. Batch Move Items [cite: 517, 542]
        if (this.cachedHksItems.length > 0) {
          syncTasks.push(this.vts.itemMove({
            itemsToMove: this.cachedHksItems.map(item => ({
              itemInstanceID: item.instanceID,
              timeInSeconds: 0,
              positionX,
              positionY,
              size: (size + 150) / 200, // Normalize
              rotation
            }))
          }));
        }

        // 2. Batch Inject Parameters [cite: 323]
        const activeParams = paramList.parameters.filter(p => 
          p.name.startsWith("ParamCustom") || p.name.startsWith("ParamPart")
        );

        if (activeParams.length > 0) {
          syncTasks.push(this.vts.injectParameterData({
            parameterValues: activeParams.map(p => ({
              id: p.name,
              value: p.value
            }))
          }));
        }

        await Promise.all(syncTasks);
      }
    } catch (e) {
      console.error("Background Sync Error:", e);
    }
  };

  private refreshCache = async () => {
    try {
      const [model, paramList, itemList] = await Promise.all([
        this.vts.currentModel(),
        this.vts.live2DParameterList(),
        this.vts.itemList({
          includeAvailableSpots: false,
          includeItemInstancesInScene: true,
          includeAvailableItemFiles: false
        })
      ]);

      if (model.modelLoaded) {
        const customParams = paramList.parameters.filter(p => 
          p.name.startsWith("ParamCustom") || p.name.startsWith("ParamPart")
        );

        await Promise.all(customParams.map(param => 
          this.vts.parameterCreation({
            parameterName: param.name,
            explanation: "HKS Sync: " + param.name,
            min: param.min,
            max: param.max,
            defaultValue: param.defaultValue
          })
        ));
      }

      this.cachedHksItems = itemList.itemInstancesInScene.filter(
        item => item.type === 'Live2D' && item.fileName.toLowerCase().startsWith('hks_')
      );

      console.log(`Cache Refreshed: Found ${this.cachedHksItems.length} HKS items.`);
    } catch (e) {
      console.error("Cache Refresh Error:", e);
    }
  };
}