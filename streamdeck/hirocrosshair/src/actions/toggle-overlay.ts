import streamDeck, { action, KeyUpEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { activeToggleInstances, syncAllButtons } from "./sync";

/**
 * Toggles the HiroCrosshair overlay with manual state management for multiple buttons.
 */
@action({ UUID: "com.hiro.crosshair.toggle" })
export class ToggleOverlay extends SingletonAction<ToggleSettings> {
	
	/**
	 * Register instance and sync state when it appears.
	 */
	override async onWillAppear(ev: WillAppearEvent<ToggleSettings>): Promise<void> {
		activeToggleInstances.add(ev.action);
		await syncAllButtons();
	}

	/**
	 * Unregister instance when it's no longer visible.
	 */
	override onWillDisappear(ev: WillDisappearEvent<ToggleSettings>): void {
		activeToggleInstances.delete(ev.action);
	}

	/**
	 * Handles button press with smart toggle and global synchronization.
	 */
	override async onKeyUp(ev: KeyUpEvent<ToggleSettings>): Promise<void> {
		try {
			const presetId = ev.payload.settings.presetId;
			const cmd = presetId ? `preset:${presetId}` : "toggle";
			
			const response = await fetch(`http://localhost:1422/?c=${cmd}`);
			const status = (await response.json()) as any;
			
			// Globally sync ALL buttons based on the new app state
			await syncAllButtons(status);
		} catch (error) {
			console.error("Error toggling HiroCrosshair:", error);
			await ev.action.showAlert();
		}
	}
}

type ToggleSettings = {
	isEnabled?: boolean;
	presetId?: string;
};
