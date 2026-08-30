import {
  Decoration,
  EditorView,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import { RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { clampDocPos, type RemotePeer } from "@/lib/socket/collab-protocol";

export const setRemotePresence = StateEffect.define<RemotePeer[]>();

class RemoteCaretWidget extends WidgetType {
  constructor(
    private readonly color: string,
    private readonly name: string,
    private readonly showLabel: boolean,
  ) {
    super();
  }

  eq(other: RemoteCaretWidget) {
    return (
      this.color === other.color &&
      this.name === other.name &&
      this.showLabel === other.showLabel
    );
  }

  toDOM() {
    const caret = document.createElement("span");
    caret.className = "cm-remote-caret";
    caret.style.borderLeftColor = this.color;

    if (this.showLabel) {
      const label = document.createElement("span");
      label.className = "cm-remote-caret-label";
      label.style.backgroundColor = this.color;
      label.textContent = this.name;
      caret.appendChild(label);
    }

    return caret;
  }

  ignoreEvent() {
    return true;
  }
}

function decorationsForPeers(peers: RemotePeer[], docLength: number): DecorationSet {
  const ranges: { from: number; to: number; deco: Decoration; side: number }[] = [];

  for (const peer of peers) {
    if (!peer.selection?.length) continue;

    peer.selection.forEach((range, index) => {
      const anchor = clampDocPos(range.anchor, docLength);
      const head = clampDocPos(range.head, docLength);
      const from = Math.min(anchor, head);
      const to = Math.max(anchor, head);

      if (from !== to) {
        ranges.push({
          from,
          to,
          deco: Decoration.mark({
            class: "cm-remote-selection",
            attributes: {
              style: `background-color: ${peer.color}33`,
            },
          }),
          side: 0,
        });
      }

      ranges.push({
        from: head,
        to: head,
        deco: Decoration.widget({
          widget: new RemoteCaretWidget(
            peer.color,
            peer.displayName || peer.userName,
            index === 0,
          ),
          side: head < anchor ? -1 : 1,
        }),
        side: head < anchor ? -1 : 1,
      });
    });
  }

  ranges.sort((a, b) => a.from - b.from || a.side - b.side || a.to - b.to);

  const builder = new RangeSetBuilder<Decoration>();
  for (const range of ranges) {
    builder.add(range.from, range.to, range.deco);
  }

  return builder.finish();
}

const remotePresenceField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setRemotePresence)) {
        return decorationsForPeers(effect.value, tr.state.doc.length);
      }
    }

    if (tr.docChanged) {
      return decorations.map(tr.changes);
    }

    return decorations;
  },
  provide: (field) => EditorView.decorations.from(field),
});

export function remotePresenceExtension() {
  return remotePresenceField;
}

export function dispatchRemotePresence(view: EditorView, peers: RemotePeer[]) {
  view.dispatch({
    effects: setRemotePresence.of(peers),
  });
}
