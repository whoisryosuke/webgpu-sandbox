import { Bindable, BindingParams, FolderApi } from "@tweakpane/core";
import { Pane } from "tweakpane";

class DebugUI {
  pane: Pane;
  folders: Map<string, FolderApi>;

  constructor() {
    this.pane = new Pane();
    this.folders = new Map();
  }

  createSection(name: string) {
    const section = this.pane.addFolder({
      title: name,
    });
    this.folders.set(name, section);
  }

  addParam(
    folderName: string,
    params: Bindable,
    paramName: string,
    options: BindingParams = {}
  ) {
    const ui = this.folders.get(folderName);
    if (!ui) return;

    ui.addBinding(params, paramName, options);
  }

  addSlider(
    folderName: string,
    params: Bindable,
    paramName: string,
    config: { min: number; max: number; step: number }
  ) {
    this.addParam(folderName, params, paramName, config);
  }
  addDropdown(
    folderName: string,
    params: Bindable,
    paramName: string,
    options: Record<string, string>
  ) {
    this.addParam(folderName, params, paramName, { options });
  }
}

const DebugUIInstance = new DebugUI();

export default DebugUIInstance;
