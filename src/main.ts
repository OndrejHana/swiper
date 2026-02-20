import {
	Notice,
	Plugin,
	ItemView,
	WorkspaceLeaf,
	Component,
	TFile,
	App,
} from "obsidian";
import { DEFAULT_SETTINGS, SwiperSettings, SwiperSettingTab } from "./settings";

export const VIEW_TYPE = "swiper-view";
export const SWIPE_THRESHOLD = 100;
export const VELOCITY_TRESHOLD = 0.11;

// Remember to rename these classes and interfaces!

export default class Swiper extends Plugin {
	settings: SwiperSettings;

	async onload() {
		await this.loadSettings();

		this.registerView(VIEW_TYPE, (leaf) => new SwiperView(leaf));

		this.addRibbonIcon("dice", "Sample", async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			// new Notice('This is a notice!');

			const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE);
			if (existing.length > 0) {
				await this.app.workspace.revealLeaf(existing[0]!);
				return;
			}

			// Create new leaf in right sidebar
			const leaf = this.app.workspace.getLeaf(true);
			await leaf.setViewState({ type: VIEW_TYPE, active: true });
		});

		// // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status bar text');

		// // This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: 'open-modal-simple',
		// 	name: 'Open modal (simple)',
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	}
		// });
		// // This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'replace-selected',
		// 	name: 'Replace selected content',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		editor.replaceSelection('Sample editor command');
		// 	}
		// });
		// // This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-modal-complex',
		// 	name: 'Open modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 		return false;
		// 	}
		// });

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SwiperSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	new Notice("Click");
		// });

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<SwiperSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class Note extends Component {
	private xStart: number | null;
	private yStart: number | null;
	private dragStart: number | null;
	private _app: App;
	private _note: TFile;
	private displayDiv: HTMLElement | null;

	constructor(
		private initialNote: TFile,
		private app: App,
	) {
		super();
		this._note = initialNote;
		this._app = app;
	}

	public get note(): TFile {
		return this._note;
	}
	public set note(value: TFile) {
		this._note = value;
		this.app.vault
			.cachedRead(this._note)
			.then((val) => this.displayDiv?.setText(val))
			.catch(() => {});
	}

	async mount(parent: HTMLElement) {
		this.displayDiv = parent.createDiv({
			text: await this.app.vault.cachedRead(this._note),
			cls: "display-div",
			attr: {
				"data-action": "NONE",
			},
		});
		this.registerDomEvent(this.displayDiv, "pointerdown", (e) => {
			this.xStart = e.x;
			this.yStart = e.y;
			this.dragStart = new Date().getTime();
		});
		this.registerDomEvent(this.displayDiv, "pointermove", (e) => {
			if (!this.xStart || !this.dragStart || !this.yStart) {
				return;
			}
			
			const dx = e.x - this.xStart;
			const t = new Date().getTime() - this.dragStart;
			const velocity = Math.abs(dx) / t;
			const rotation = dx * 0.05;

			this.displayDiv?.style.setProperty('--swipe-amount', `${dx.toString()}px`)
			this.displayDiv?.style.setProperty('--rotation-amount', `${rotation}deg`)
			
			if (
				Math.abs(dx) >= SWIPE_THRESHOLD ||
				velocity > VELOCITY_TRESHOLD
			) {
				if (dx > 0) {
					this.displayDiv?.setAttr("data-action", "RIGHT");
				} else {
					this.displayDiv?.setAttr("data-action", "LEFT");
				}
			} else {
				this.displayDiv?.setAttr("data-action", "NONE");
			}
		});
		this.registerDomEvent(this.displayDiv, "pointerup", (e) => {
			this.xStart = null;
			this.yStart = null;
			this.dragStart = null;
			this.displayDiv?.setAttr("data-action", "NONE");
			this.displayDiv?.style.setProperty('--swipe-amount', "0px");
			this.displayDiv?.style.setProperty('--rotation-amount', "0deg");
		})
		this.registerDomEvent(this.displayDiv, "pointerleave", (e) => {
			this.xStart = null;
			this.yStart = null;
			this.dragStart = null;
			this.displayDiv?.setAttr("data-action", "NONE");
			this.displayDiv?.style.setProperty('--swipe-amount', "0px");
			this.displayDiv?.style.setProperty('--rotation-amount', "0deg");
		})
	}
}	

export class SwiperView extends ItemView {
	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE;
	}

	getDisplayText() {
		return "Example view";
	}

	async onOpen() {
		const pluginParent = this.contentEl;
		const container = pluginParent.createDiv();
		container.classList.add("plugin-container");
		container.empty();
		container.createEl("h4", { text: "Example view" });

		const allMarkdownFiles = this.app.vault.getMarkdownFiles();
		const folderPath = "0 Inbox";
		const reviewNotes = allMarkdownFiles
			.filter(
				(file) =>
					file.path.startsWith(folderPath + "/") ||
					file.path === folderPath,
			)
			.filter((file) => {
				const cache = this.app.metadataCache.getFileCache(file);
				return cache?.tags?.some((tag) => "review");
			});

		if (reviewNotes.length === 0) {
			console.error("invalid length");
			return;
		}

		const note = new Note(reviewNotes[0]!, this.app);
		await note.mount(container);
	}

	async onClose() {
		// Nothing to clean up.
	}
}
