# Ef Themes for VS Code

A port of the [Ef themes](https://github.com/protesilaos/ef-themes) for GNU
Emacs by Protesilaos Stavrou: colorful ("pretty") yet legible light and dark
themes. All 38 themes are included, among them the deuteranopia and tritanopia
variants for color vision deficiency.

Pictures of the originals: <https://protesilaos.com/emacs/ef-themes-pictures>.

This is an unofficial port and is not affiliated with the Ef themes project.

## Themes

### Light

| Theme | Description |
| --- | --- |
| Ef Arbutus | Legible light pink theme with red and green colors. |
| Ef Arcadia | Legible light theme with verdant colors. |
| Ef Cyprus | Legible light ochre theme with green, yellow, teal, red colors. |
| Ef Day | Legible light sandy theme with warm, varied colors (yellow, red, green, purple). |
| Ef Deuteranopia Light | Legible light theme, optimized for red-green color deficiency. |
| Ef Duo Light | Legible light theme with mostly blue and yellow colors. |
| Ef Eagle | Legible light beige theme with brown, red, and desatured colors. |
| Ef Elea Light | Legible light green theme with brown, magenta, and green colors. |
| Ef Frost | Legible light cool theme with blue, cyan, teal, purple colors. |
| Ef Kassio | Legible light grey theme with blue, red, magenta, and earthly colors. |
| Ef Light | Legible light theme with blue, magenta, cyan, purple colors. |
| Ef Maris Light | Legible light marine theme with blue, cyan, and green colors. |
| Ef Melissa Light | Legible light honeybee theme with warm colors (yellow, red, green, cyan). |
| Ef Orange | Legible light theme with orange, yellow, and green colors. |
| Ef Reverie | Legible light lavender theme with gold and nuanced colors. |
| Ef Spring | Legible light floral theme with cool, varied colors (green, cyan, red). |
| Ef Summer | Legible light warm pink theme with magenta, purple, gold, cyan colors. |
| Ef Trio Light | Legible light purple grey theme with magenta, blue, and teal colors. |
| Ef Tritanopia Light | Legible light theme, optimized for blue-yellow color deficiency. |

### Dark

| Theme | Description |
| --- | --- |
| Ef Atlantis | Legible dark theme with aquatic colors. |
| Ef Autumn | Legible dark brown-black theme with warm colors (red, yellow, green, teal). |
| Ef Bio | Legible dark green-black theme with green, teal, blue, purple colors. |
| Ef Cherie | Legible dark purple-black theme with warm colors (mostly pink, magenta, gold). |
| Ef Dark | Legible dark theme with blue, magenta, cyan, purple colors. |
| Ef Deuteranopia Dark | Legible dark theme, optimized for red-green color deficiency. |
| Ef Dream | Legible dark purple grey theme with gold and nuanced colors. |
| Ef Duo Dark | Legible dark theme with mostly blue and orange colors. |
| Ef Elea Dark | Legible dark green theme with brown, magenta, and green colors. |
| Ef Fig | Legible dark theme with warm green, yellow, and magenta colors. |
| Ef Maris Dark | Legible dark marine theme with blue, cyan, and green colors. |
| Ef Melissa Dark | Legible dark honeybee theme with warm colors (yellow, red, green, cyan). |
| Ef Night | Legible dark sky blue theme with mostly green, blue, purple colors. |
| Ef Owl | Legible dark grey theme with blue, cyan, magenta and desaturated colors. |
| Ef Rosa | Legible dark rosewood theme with magenta and green colors. |
| Ef Symbiosis | Legible dark brown-black theme with blue, green, cyan, gold colors. |
| Ef Trio Dark | Legible dark purple grey theme with magenta, blue, teal colors. |
| Ef Tritanopia Dark | Legible dark theme, optimized for blue-yellow color deficiency. |
| Ef Winter | Legible dark purple-black theme with magenta, purple, fawn, teal colors. |

## How the port works

The colors are not hand-copied. Each Ef theme defines part of its palette and
`modus-themes` (which Ef builds on) generates the rest, so
`scripts/dump-palettes.el` loads both packages in Emacs and records every
palette entry exactly as Emacs resolves it.

`scripts/build.mjs` then turns each palette into a VS Code theme. The mapping
follows how `modus-themes` assigns palette entries to Emacs faces, for example:

| VS Code | Emacs face | Palette entry |
| --- | --- | --- |
| Status bar | `mode-line` | `bg-mode-line-active`, `fg-mode-line-active` |
| Tabs | `tab-bar` | `bg-tab-bar`, `bg-tab-current`, `bg-tab-other` |
| Selected list item | `vertico-current` | `bg-completion` |
| Suggestions popup | `corfu-default` | `bg-popup` |
| Current search match | `isearch` | `bg-search-current` |
| Other search matches | `lazy-highlight` | `bg-search-lazy` |
| Bracket pair colors | `rainbow-delimiters` | `rainbow-0` to `rainbow-5` |
| Function name / call | `font-lock-function-name-face` / `-call-face` | `fnname` / `fnname-call` |
| Variable definition / use | `font-lock-variable-name-face` / `-use-face` | `variable` / `variable-use` |

Language-specific choices follow the Emacs major modes (mostly the tree-sitter
ones): for instance Python decorators use the type color, Rust attributes the
preprocessor color, and JSON, YAML and TOML keys the property color.

Some VS Code highlights must be translucent so they don't hide what's beneath
them. Those use a translucent color that looks exactly like the Ef color over
the editor background.

## Bold and italic

Like the Emacs defaults (`modus-themes-bold-constructs` and
`modus-themes-italic-constructs` are off), code has no bold or italic. To
approximate turning those options on, add this to your `settings.json`:

```jsonc
"editor.tokenColorCustomizations": {
  "textMateRules": [
    // Like modus-themes-italic-constructs
    { "scope": ["comment", "string.quoted.docstring"], "settings": { "fontStyle": "italic" } },
    // Roughly like modus-themes-bold-constructs (operators stay regular)
    { "scope": ["keyword", "storage", "entity.name.type", "support.type", "support.class", "support.function.builtin"], "settings": { "fontStyle": "bold" } },
    { "scope": ["keyword.operator", "storage.type.function.arrow"], "settings": { "fontStyle": "" } }
  ]
}
```

## Rebuilding

The Ef and Modus sources are git submodules in `vendor/`, pinned to the
revisions the themes were built from. After cloning, fetch them with:

```sh
git submodule update --init
```

To pick up a new release of the Ef themes (needs `emacs` on your PATH):

```sh
git submodule update --remote          # move both submodules to their latest commits
npm run palettes                       # re-resolve the palettes in Emacs
npm run build                          # regenerate themes/ and package.json
```

`scripts/palettes.json` records the ef-themes and modus-themes revisions it
came from. Commit it together with the submodule bump and the regenerated
themes.

## License

GPL-3.0-or-later, the same as the Ef themes. See [LICENSE](LICENSE).
