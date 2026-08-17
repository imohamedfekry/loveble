import interact from "@replit/codemirror-interact";

export const numberInteract = interact({
  key: "alt",
  rules: [
    {
      regexp: /-?\b\d+\.?\d*\b/g,
      cursor: "ew-resize",
      onDrag: (text, setText, e) => {
        const value = Number(text);
        if (Number.isNaN(value)) return;
        const decimals = text.includes(".") ? text.split(".")[1].length : 0;
        const step = decimals > 0 ? Math.pow(0.1, decimals) : 1;
        const newVal = value + e.movementX * step;
        setText(parseFloat(newVal.toFixed(decimals)).toString());
      },
    },
  ],
});
