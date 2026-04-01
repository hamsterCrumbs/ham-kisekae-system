# Ham's Kisekae System (HKS)

A high-performance, web-based synchronization engine for **VTube Studio** designed to handle modular clothing and accessories with minimal latency.

---

## **Overview**
The Kisekae System allows VTubers and content creators to drag and drop Live2D items into a scene and have them automatically track the main model's position and parameters. It uses a "tracking-part-physics" logic to ensure that items move naturally while preserving the base model's original physics settings.

## **Core Features**
* **Real-time Sync**: Synchronizes item position, rotation, and scale with the main Live2D model using batched API requests.
* **Parameter Mirroring**: Automatically reflects `ParamCustom` and `ParamPart` values from the main model to all connected HKS items.
* **Event-Driven Architecture**: Utilizes the VTube Studio Event API to minimize CPU usage by refreshing item lists only when models or items are loaded/changed.
* **Parallel Processing**: Uses `Promise.all` to gather data and inject parameters simultaneously, ensuring updates happen within a single frame.

## **Technical Stack**
* **Framework**: [Svelte](https://svelte.dev/) + [Vite](https://vitejs.dev/)
* **Language**: TypeScript
* **API Library**: [VTubeStudioJS](https://github.com/Hawkbar/VTubeStudioJS)

## **How to Use**
1. **Authorize**: Open VTube Studio, ensure "Allow Plugin API access" is turned on in the settings, and click **Connect** on the dashboard.
2. **Naming Convention**: Live2D items must have the `HKS_` prefix in their filename to be recognized by the engine.
3. **Sync**: Toggle **Start Sync** to begin the real-time tracking loop.

## **Legal**
Built using the public [VTube Studio API](https://github.com/DenchiSoft/VTubeStudio). No permission is required and there are no licensing fees or royalties for plugin development.