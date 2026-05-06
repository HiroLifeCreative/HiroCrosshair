import { SingletonAction } from "@elgato/streamdeck";

export const activeToggleInstances = new Set<any>();
export const activeGameInstances = new Set<any>();

export async function syncAllButtons(status?: any) {
	try {
		const appStatus = status || await (await fetch("http://localhost:1422/status")).json();

		// Sync Toggle Overlay Buttons
		for (const action of activeToggleInstances) {
			try {
				const settings = await action.getSettings() as { presetId?: string, isEnabled?: boolean };
				const btnPresetId = settings.presetId;
				const shouldBeOn = appStatus.visible && (!btnPresetId || btnPresetId === appStatus.activePresetId);
				await action.setState(shouldBeOn ? 1 : 0);
				await action.setSettings({ ...settings, isEnabled: shouldBeOn });
			} catch (err) {
				console.error("Failed to sync toggle action:", err);
			}
		}

		// Sync Select Game Buttons
		for (const action of activeGameInstances) {
			try {
				const settings = await action.getSettings() as { id?: string, type?: string, isEnabled?: boolean };
				const btnGameId = settings.id;
				// A game button is ON if it matches the active game ID.
				const shouldBeOn = btnGameId === appStatus.activeGameId;
				await action.setState(shouldBeOn ? 1 : 0);
				await action.setSettings({ ...settings, isEnabled: shouldBeOn });
			} catch (err) {
				console.error("Failed to sync game action:", err);
			}
		}
	} catch (err) {
		console.error("Failed to fetch global status for sync:", err);
	}
}
