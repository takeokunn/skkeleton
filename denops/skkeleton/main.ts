import { config, setConfig } from "./config.ts";
import { Context } from "./context.ts";
import {
  anonymous,
  autocmd,
  Denops,
  ensureObject,
  ensureString,
  vars,
} from "./deps.ts";
import * as jisyo from "./jisyo.ts";
import { handleKey } from "./keymap.ts";
import { receiveNotation } from "./notation.ts";
import { Cell } from "./util.ts";

let initialized = false;

export const currentContext = new Cell(() => new Context());

async function init(denops: Denops) {
  if (config.debug) {
    console.log("skkeleton: initialize");
    console.log(config);
  }
  currentContext.get().denops = denops;
  const { globalJisyo, userJisyo, globalJisyoEncoding } = config;
  jisyo.currentLibrary.set(
    await jisyo.load(globalJisyo, userJisyo, globalJisyoEncoding),
  );
  await receiveNotation(denops);
  const id = anonymous.add(denops, () => {
    currentContext.init().denops = denops;
  })[0];
  autocmd.group(denops, "skkeleton", (helper) => {
    helper.define(
      ["InsertEnter", "CmdlineEnter"],
      "*",
      `call denops#notify('${denops.name}', '${id}', [])`,
    );
  });
}

export async function main(denops: Denops) {
  if (await vars.g.get(denops, "skkeleton#debug", false)) {
    config.debug = true;
  }
  denops.dispatcher = {
    config(config: unknown) {
      ensureObject(config);
      setConfig(config);
      return Promise.resolve();
    },
    async enable(): Promise<string> {
      if (!initialized) {
        await init(denops);
        initialized = true;
      }
      if (await denops.eval("&l:iminsert") !== 1) {
        currentContext.init().denops = denops;
        try {
          await denops.cmd("doautocmd <nomodeline> User skkeleton-enable-pre");
        } catch (e) {
          console.log(e);
        }
        await denops.call("skkeleton#map");
        await denops.cmd("setlocal iminsert=1");
        await vars.b.set(denops, "keymap_name", "skkeleton");
        try {
          await denops.cmd("doautocmd <nomodeline> User skkeleton-enable-post");
        } catch (e) {
          console.log(e);
        }
        await vars.g.set(denops, "skkeleton#enabled", true);
        return "\x1e"; // <C-^>
      } else {
        return "";
      }
    },
    async handleKey(key: unknown, vimMode: unknown): Promise<string> {
      ensureString(key);
      ensureString(vimMode);
      const context = currentContext.get();
      context.vimMode = vimMode;
      await handleKey(context, key);
      return context.preEdit.output(context.toString());
    },
  };
  if (config.debug) {
    await denops.cmd(`echomsg "loaded skkeleton"`);
  }
}
