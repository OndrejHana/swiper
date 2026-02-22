import {
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
	private _parent: HTMLElement;
	private onleft: (note: TFile) => void | Promise<void>;
	private onright: (note: TFile) => void | Promise<void>;
	private ondclick: (note: TFile) => void | Promise<void>;

	constructor(
		private initialNote: TFile,
		private app: App,
		private parent: HTMLElement,
		private onleftHandler: (note: TFile) => void | Promise<void>,
		private onrightHandler: (note: TFile) => void | Promise<void>,
		private ondclickHandler: (note: TFile) => void | Promise<void>,
	) {
		super();
		this._note = initialNote;
		this._app = app;
		this._parent = parent;
		this.onleft = onleftHandler;
		this.onright = onrightHandler;
		this.ondclick = ondclickHandler;
	}

	private createCard(val: string) {
		this.displayDiv = this._parent.createDiv({
			text: val,
			cls: "display-div",
			attr: {
				"data-action": "NONE",
			},
		});

		this.registerDomEvent(this.displayDiv, "dblclick", () =>
			this.ondclick(this.note),
		);
		this.registerDomEvent(this.displayDiv, "pointerdown", (e) => {
			this.xStart = e.x;
			this.yStart = e.y;
			this.dragStart = new Date().getTime();
			this.displayDiv?.setCssProps({
				"--swipe-amount": "0px",
				"--rotation-amount": "0deg",
			});
		});
		this.registerDomEvent(this.displayDiv, "pointermove", (e) => {
			if (!this.xStart || !this.dragStart || !this.yStart) {
				return;
			}

			const dx = e.x - this.xStart;
			const t = new Date().getTime() - this.dragStart;
			const velocity = Math.abs(dx) / t;
			const rotation = dx * 0.05;

			this.displayDiv?.setCssProps({
				"--swipe-amount": `${dx.toString()}px`,
				"--rotation-amount": `${rotation}deg`,
			});

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
		this.registerDomEvent(this.displayDiv, "pointerup", async (e) => {
			if (this.displayDiv?.getAttr("data-action") === "RIGHT") {
				await this.onright(this.note);
			}
			if (this.displayDiv?.getAttr("data-action") === "LEFT") {
				await this.onleft(this.note);
			}

			this.xStart = null;
			this.yStart = null;
			this.dragStart = null;
			this.displayDiv?.setAttr("data-action", "NONE");
			this.displayDiv?.setCssProps({
				"--swipe-amount": "0px",
				"--rotation-amount": "0deg",
			});
		});
		this.registerDomEvent(this.displayDiv, "pointerleave", (e) => {
			this.xStart = null;
			this.yStart = null;
			this.dragStart = null;
			this.displayDiv?.setAttr("data-action", "NONE");
			this.displayDiv?.setCssProps({
				"--swipe-amount": "0px",
				"--rotation-amount": "0deg",
			});
		});
	}

	public get note(): TFile {
		return this._note;
	}

	public set note(value: TFile) {
		this._note = value;
		this.app.vault
			.cachedRead(this._note)
			.then((val) => {
				this.displayDiv?.remove();
				this.createCard(val);
			})
			.catch(() => {});
	}

	async mount() {
		const content = await this.app.vault.cachedRead(this._note);
		this.createCard(content);
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
		const container = pluginParent.createDiv({
			cls: "container",
		});
		container.classList.add("plugin-container");
		container.empty();
		container.createEl("h4", { text: "Example view" });

		const allMarkdownFiles = this.app.vault.getMarkdownFiles();
		const folderPath = "Inbox";
		const temp = allMarkdownFiles.filter(
			(file) =>
				file.path.startsWith(folderPath + "/") ||
				file.path === folderPath,
		);
		const reviewNotes = temp.filter((file) => {
			const cache = this.app.metadataCache.getFileCache(file);
			return cache?.tags?.some((tag) => tag.tag === "#review");
		});

		if (reviewNotes.length === 0) {
			console.error("invalid length");
			return;
		}

		const note = new Note(
			reviewNotes[0]!,
			this.app,
			container,
			async (file) => {
				await this.app.vault.rename(file, `Archive/${file.name}`);
				note.note = reviewNotes[1]!;
			},
			async (file) => {},
			async (file) => {},
		);

		await note.mount();
	}

	async onClose() {
		// Nothing to clean up.
	}
}
