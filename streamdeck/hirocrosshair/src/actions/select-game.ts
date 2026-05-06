import { action, KeyUpEvent, SingletonAction, WillAppearEvent, WillDisappearEvent } from "@elgato/streamdeck";
import { activeGameInstances, syncAllButtons } from "./sync";

/**
 * Selects a specific game or overlay slot in HiroCrosshair.
 */
@action({ UUID: "com.hiro.crosshair.select" })
export class SelectGame extends SingletonAction<SelectSettings> {
	
	override async onWillAppear(ev: WillAppearEvent<SelectSettings>): Promise<void> {
		activeGameInstances.add(ev.action);
		await syncAllButtons();
	}

	override onWillDisappear(ev: WillDisappearEvent<SelectSettings>): void {
		activeGameInstances.delete(ev.action);
	}

	/**
	 * Sends a select command to HiroCrosshair using the configured ID.
	 */
	override async onKeyUp(ev: KeyUpEvent<SelectSettings>): Promise<void> {
		const { id } = ev.payload.settings;

		if (!id) {
			await ev.action.showAlert();
			return;
		}

		try {
			// Send the select command exclusively for games
			const response = await fetch(`http://localhost:1422/?c=game:${id}`);
			const status = (await response.json()) as any;
			
			// Globally sync ALL buttons based on the new app state
			await syncAllButtons(status);
		} catch (error) {
			console.error("Error selecting game:", error);
			await ev.action.showAlert();
		}
	}
}

/**
 * Settings for SelectGame action.
 */
type SelectSettings = {
	id?: string;
	isEnabled?: boolean;
};
