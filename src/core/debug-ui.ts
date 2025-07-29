import {
  Bindable,
  BindingApi,
  BindingParams,
  FolderApi,
  TpChangeEvent,
} from "@tweakpane/core";
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

    return section;
  }

  add(
    folderName: string,
    params: Bindable,
    paramName: string,
    options: BindingParams = {},
    handler?: (e: { value: any }) => void
  ) {
    let ui = this.folders.get(folderName);
    if (!ui) {
      ui = this.createSection(folderName);
    }

    const binding = ui.addBinding(params, paramName, options);
    if (handler) binding.on("change", handler);
  }

  slider(
    folderName: string,
    params: Bindable,
    paramName: string,
    config: { min: number; max: number; step: number }
  ) {
    this.add(folderName, params, paramName, config);
  }
  dropdown(
    folderName: string,
    params: Bindable,
    paramName: string,
    options: Record<string, string>
  ) {
    this.add(folderName, params, paramName, { options });
  }
}

const DebugUIInstance = new DebugUI();

export default DebugUIInstance;
