import streamDeck from "@elgato/streamdeck";

import { ToggleOverlay } from "./actions/toggle-overlay";
import { SelectGame } from "./actions/select-game";

// Enable trace logging
streamDeck.logger.setLevel("trace");

// Register the actions
streamDeck.actions.registerAction(new ToggleOverlay());
streamDeck.actions.registerAction(new SelectGame());

// Finally, connect to the Stream Deck.
streamDeck.connect();

// Background polling to ensure the Stream Deck instantly reflects
// any changes made directly in the HiroCrosshair desktop app UI.
import { syncAllButtons } from "./actions/sync";

setInterval(async () => {
    try {
        await syncAllButtons();
    } catch (e) {
        // App might be closed, ignore
    }
}, 500);
