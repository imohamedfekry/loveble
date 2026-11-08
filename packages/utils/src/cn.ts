import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge, validators } from "tailwind-merge"

const radiusRoots = [
  "rounded",
  "rounded-s",
  "rounded-e",
  "rounded-t",
  "rounded-r",
  "rounded-b",
  "rounded-l",
  "rounded-ss",
  "rounded-se",
  "rounded-ee",
  "rounded-es",
  "rounded-tl",
  "rounded-tr",
  "rounded-br",
  "rounded-bl",
] as const

// Register tailwindcss-concentric's utilities on the core radius groups so
// cn("rounded-lg", "rounded-concentric") resolves to the concentric class.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      ...Object.fromEntries(
        radiusRoots.map((root) => [
          root,
          [
            {
              [root]:
                root === "rounded"
                  ? [
                      "concentric",
                      {
                        concentric: [
                          validators.isNumber,
                          validators.isArbitraryValue,
                        ],
                      },
                    ]
                  : ["concentric"],
            },
          ],
        ])
      ),
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
