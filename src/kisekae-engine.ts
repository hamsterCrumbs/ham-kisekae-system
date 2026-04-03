import type { ApiClient } from 'vtubestudio';

export class KisekaeEngine {
  private vts: ApiClient;
  private isRunning: boolean = false;
  private worker: Worker | null = null;
  private workerUrl: string | null = null;
  
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
    this.workerUrl = URL.createObjectURL(blob);
    this.worker = new Worker(this.workerUrl);

    this.worker.onmessage = () => {
      this.syncFrame(); // This runs even if the tab is hidden
    };

    this.worker.postMessage('start');
  }

  public stop() {
    this.isRunning = false;
    this.worker?.postMessage('stop');
    this.worker?.terminate();
    
    if (this.workerUrl) {
      URL.revokeObjectURL(this.workerUrl);
      this.workerUrl = null;
    }
    
    this.vts.events.modelLoaded.unsubscribe();
    this.vts.events.item.unsubscribe();
  }

  private syncFrame = async () => {
    if (!this.isRunning || !this.vts) return;

    try {
      const [model, paramList] = await Promise.all([
        this.vts.currentModel(),
        this.vts.live2DParameterList()
      ]);

      if (model.modelLoaded) {
        const { positionX, positionY, size, rotation } = model.modelPosition;
        const syncTasks: Promise<any>[] = [];
        const now = performance.now();
        const fps = 1000 / (now - this.lastFrameTime);
        this.lastFrameTime = now;

        syncTasks.push(this.vts.injectParameterData({
          parameterValues: [{
            id: "ParamFPS",
            //parse the fps value to an integer
            value: Math.floor(Math.min(fps, 200)),
          }]
        }));

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
        
        await this.vts.parameterCreation({
          parameterName: "ParamFPS",
          explanation: "HKS FPS Counter",
          min: 0,
          max: 200,
          defaultValue: 0
        });
        
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

      if (this.cachedHksItems.length > 0 && model.modelLoaded) {
        const { positionX, positionY, size, rotation } = model.modelPosition;
        await this.vts.itemMove({
          itemsToMove: this.cachedHksItems.map(item => ({
            itemInstanceID: item.instanceID,
            timeInSeconds: 0,
            positionX,
            positionY,
            size: (size + 150) / 200,
            rotation
          }))
        });
      }
      

      console.log(`Cache Refreshed: Found ${this.cachedHksItems.length} HKS items.`);
    } catch (e) {
      console.error("Cache Refresh Error:", e);
    }
  };
}