import type { ApiClient } from 'vtubestudio';

export class KisekaeEngine {
  private vts: ApiClient;
  private isRunning: boolean = false;

  // Cached data managed by Event API
  private cachedHksItems: any[] = [];
  private lastFrameTime: number = 0;
  private lastModelPosition: any = null;

  

  constructor(vtsClient: ApiClient) {
    this.vts = vtsClient;
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // 1. Initial Data Fetch
    await this.refreshCache();

    // 2. Subscribe to Events (Event API) 
    // Only refresh the item list and model parameters when they actually change
    this.vts.events.modelLoaded.subscribe(this.refreshCache, {});
    this.vts.events.item.subscribe(this.refreshCache, {});

    this.loop();
  }

  public stop() {
    this.isRunning = false;
    // Unsubscribe to prevent memory leaks [cite: 47]
    this.vts.events.modelLoaded.unsubscribe();
    this.vts.events.item.unsubscribe();
  }

  /**
   * Refreshes model and item data only when an event triggers[cite: 111].
   */
  private refreshCache = async () => {
    try {
      // Get data needed to identify items and custom parameters 
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
        // Filter parameters starting with "ParamCustom" or "ParamPart" [cite: 297]
        const customParams = paramList.parameters.filter(p => 
          p.name.startsWith("ParamCustom") || p.name.startsWith("ParamPart")
        );

        // Batch create tracking parameters to ensure they exist in VTS [cite: 303]
        // We use Promise.all here to fire all creation requests at once
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

      // Filter for HKS Live2D items [cite: 435]
      this.cachedHksItems = itemList.itemInstancesInScene.filter(
        item => item.type === 'Live2D' && item.fileName.toLowerCase().startsWith('hks_')
      );

      console.log(`Cache Refreshed: Found ${this.cachedHksItems.length} HKS items.`);
    } catch (e) {
      console.error("Cache Refresh Error:", e);
    }
  };

  private normalizeSize(value: number): number {
    return ((value + 100) / 200) + 0.2;
  }

  private loop = async () => {
    if (!this.isRunning || !this.vts) return;

    // Performance tracking
    const now = performance.now();
    const delta = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    const fps = delta > 0 ? Math.round(1 / delta) : 0;

    try {
      // --- DATA GATHERING STEP (PARALLEL) ---
      // We pull model position and current parameter values at the same time 
      const [model, paramList] = await Promise.all([
        this.vts.currentModel(),
        this.vts.live2DParameterList()
      ]);

      if (model.modelLoaded) {
        const { positionX, positionY, size, rotation } = model.modelPosition;
        const normalizedSize = this.normalizeSize(size);

        // --- DATA SETTING STEP (PARALLEL) ---
        const syncTasks: Promise<any>[] = [];

        // 1. Batch Move Items [cite: 543]
        if (this.cachedHksItems.length > 0) {

          //compare if lastModelPosition and model.modelPosition has changed
          if (
            this.lastModelPosition?.positionX === positionX &&
            this.lastModelPosition?.positionY === positionY &&
            this.lastModelPosition?.size === size &&
            this.lastModelPosition?.rotation === rotation
          ) {
            
          } else {
            this.lastModelPosition = { positionX, positionY, size, rotation };
            syncTasks.push(this.vts.itemMove({
                itemsToMove: this.cachedHksItems.map(item => ({
                itemInstanceID: item.instanceID,
                timeInSeconds: 0, // Instant sync [cite: 524]
                positionX,
                positionY,
                size: normalizedSize,
                rotation
                }))
            }));
          }
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

        // Send all updates to VTS simultaneously to reduce frame lag
        await Promise.all(syncTasks);
      }
    } catch (e) {
      console.error("Sync Loop Error:", e);
    }

    requestAnimationFrame(this.loop);
  };
}