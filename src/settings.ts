import {App, PluginSettingTab, Setting} from "obsidian";
import Swiper from "./main";

export interface SwiperSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: SwiperSettings = {
	mySetting: 'default'
}

export class SwiperSettingTab extends PluginSettingTab {
	plugin: Swiper;

	constructor(app: App, plugin: Swiper) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
