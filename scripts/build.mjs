#!/usr/bin/env node
// Build the VS Code color themes from scripts/palettes.json.
//
// Every color is an Ef palette entry, resolved by Emacs itself (see
// update-palettes.sh). The mapping follows how modus-themes (which the
// Ef themes build on) assigns palette entries to Emacs faces, carried
// over to VS Code's workbench colors and token scopes. Defaults match
// the Emacs defaults: no bold or italic syntax, since
// `modus-themes-bold-constructs' and `modus-themes-italic-constructs'
// are off.
//
// Usage: node scripts/build.mjs

import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { source, themes } = JSON.parse(readFileSync(join(root, 'scripts', 'palettes.json'), 'utf8'));

// ---------------------------------------------------------------------------
// Colors

const HEX = /^#[0-9a-f]{6}$/;
const NONE = '#00000000';

const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (values) => '#' + values.map((v) => v.toString(16).padStart(2, '0')).join('');

// A translucent color that looks like `target` when drawn over `base`.
// VS Code asks for some highlights to be translucent so they do not hide
// what lies beneath; this keeps the Ef color where it is normally seen.
function over(target, base, minAlpha = 0.6) {
  const t = channels(target);
  const b = channels(base);
  for (let a8 = Math.ceil(minAlpha * 255); a8 < 255; a8++) {
    const a = a8 / 255;
    const c = t.map((v, i) => Math.min(255, Math.max(0, Math.round((v - (1 - a) * b[i]) / a))));
    const shown = c.map((v, i) => Math.round(v * a + b[i] * (1 - a)));
    if (shown.every((v, i) => Math.abs(v - t[i]) <= 1)) return toHex([...c, a8]);
  }
  throw new Error(`cannot make ${target} translucent over ${base}`);
}

function accessor(name) {
  const palette = themes[name].palette;
  const get = (key) => {
    const value = palette[key];
    if (value === undefined) throw new Error(`${name}: no palette entry "${key}"`);
    if (!HEX.test(value)) throw new Error(`${name}: palette entry "${key}" is ${value}`);
    return value;
  };
  // For entries that Ef may leave unspecified (meaning "inherit").
  get.or = (key, fallback) => (palette[key] === 'unspecified' ? get(fallback) : get(key));
  return get;
}

// ---------------------------------------------------------------------------
// Workbench colors

function workbench(c) {
  const t = (key, base = 'bg-main') => over(c(key), c(base));

  const colors = {
    // Base
    foreground: c('fg-main'),
    disabledForeground: c('fg-dim'),
    descriptionForeground: c('fg-dim'),
    errorForeground: c('err'),
    'icon.foreground': c('fg-main'),
    focusBorder: c('accent-0'),
    'selection.background': c('bg-region'),
    'widget.border': c('border'), // child-frame-border
    'widget.shadow': NONE,
    'scrollbar.shadow': NONE,
    'sash.hoverBorder': c('fg-dim'),
    'toolbar.hoverBackground': c('bg-hover'),
    'textLink.foreground': c('fg-link'),
    'textLink.activeForeground': c('fg-link'),
    'textPreformat.foreground': c('fg-prose-code'),
    'textBlockQuote.background': c('bg-dim'),
    'textBlockQuote.border': c('border'),
    'textCodeBlock.background': c('bg-prose-block-contents'),
    'textSeparator.foreground': c('border'),

    // Title bar and menus
    'titleBar.activeBackground': c('bg-dim'),
    'titleBar.activeForeground': c('fg-main'),
    'titleBar.inactiveBackground': c('bg-dim'),
    'titleBar.inactiveForeground': c('fg-dim'),
    'titleBar.border': c('border'),
    'menubar.selectionBackground': c('bg-hover'),
    'menubar.selectionForeground': c('fg-main'),
    'menu.background': c('bg-popup'),
    'menu.foreground': c('fg-main'),
    'menu.selectionBackground': c('bg-completion'),
    'menu.selectionForeground': c('fg-main'),
    'menu.separatorBackground': c('border'),
    'menu.border': c('border'),

    // Activity bar and side bar
    'activityBar.background': c('bg-dim'),
    'activityBar.foreground': c('fg-main'),
    'activityBar.inactiveForeground': c('fg-dim'),
    'activityBar.border': c('border'),
    'activityBar.activeBorder': c('accent-0'),
    'activityBarBadge.background': c('bg-mode-line-active'),
    'activityBarBadge.foreground': c('fg-mode-line-active'),
    'activityBarTop.foreground': c('fg-main'),
    'activityBarTop.inactiveForeground': c('fg-dim'),
    'activityBarTop.activeBorder': c('accent-0'),
    'sideBar.background': c('bg-main'),
    'sideBar.foreground': c('fg-main'),
    'sideBar.border': c('border'),
    'sideBarTitle.foreground': c('fg-main'),
    'sideBarSectionHeader.foreground': c('fg-main'),
    'sideBarSectionHeader.border': c('border'),

    // Lists and trees (vertico/completion styles)
    'list.activeSelectionBackground': c('bg-completion'),
    'list.activeSelectionForeground': c('fg-main'),
    'list.activeSelectionIconForeground': c('fg-main'),
    'list.inactiveSelectionBackground': c('bg-hl-line'),
    'list.inactiveSelectionForeground': c('fg-main'),
    'list.hoverBackground': c('bg-hover'), // highlight
    'list.hoverForeground': c('fg-main'),
    'list.highlightForeground': c('fg-completion-match-0'),
    'list.focusHighlightForeground': c('fg-completion-match-0'),
    'list.errorForeground': c('err'),
    'list.warningForeground': c('warning'),
    'list.invalidItemForeground': c('err'),
    'list.deemphasizedForeground': c('fg-dim'),
    'list.dropBackground': t('bg-hover-secondary'),
    'list.filterMatchBackground': t('bg-search-lazy'),
    'listFilterWidget.background': c('bg-popup'),
    'listFilterWidget.outline': c('border'),
    'listFilterWidget.noMatchesOutline': c('err'),
    'tree.indentGuidesStroke': c('border'),

    // Command palette and quick pick (minibuffer)
    'quickInput.background': c('bg-popup'),
    'quickInput.foreground': c('fg-main'),
    'quickInputTitle.background': c('bg-alt'),
    'quickInputList.focusBackground': c('bg-completion'),
    'quickInputList.focusForeground': c('fg-main'),
    'quickInputList.focusIconForeground': c('fg-main'),
    'pickerGroup.foreground': c('fg-dim'), // completions-group-title
    'pickerGroup.border': c('border'), // completions-group-separator
    'keybindingLabel.foreground': c('keybind'), // help-key-binding
    'keybindingLabel.background': c('bg-dim'),
    'keybindingLabel.border': c('border'),
    'keybindingLabel.bottomBorder': c('border'),

    // Inputs and buttons
    'input.background': c('bg-main'),
    'input.foreground': c('fg-main'),
    'input.border': c('border'),
    'input.placeholderForeground': c('fg-dim'),
    'inputOption.activeBackground': c('bg-active'),
    'inputOption.activeForeground': c('fg-main'),
    'inputOption.activeBorder': c('border'),
    'inputOption.hoverBackground': c('bg-hover'),
    'inputValidation.errorBackground': c('bg-err'),
    'inputValidation.errorForeground': c('err'),
    'inputValidation.errorBorder': c('underline-err'),
    'inputValidation.warningBackground': c('bg-warning'),
    'inputValidation.warningForeground': c('warning'),
    'inputValidation.warningBorder': c('underline-warning'),
    'inputValidation.infoBackground': c('bg-info'),
    'inputValidation.infoForeground': c('info'),
    'inputValidation.infoBorder': c('underline-note'),
    'dropdown.background': c('bg-main'),
    'dropdown.foreground': c('fg-main'),
    'dropdown.border': c('border'),
    'dropdown.listBackground': c('bg-popup'),
    'checkbox.background': c('bg-main'),
    'checkbox.foreground': c('fg-main'),
    'checkbox.border': c('border'),
    'button.background': c('bg-button-active'),
    'button.foreground': c('fg-button-active'),
    'button.border': c('border'),
    'button.hoverBackground': c('bg-hover'),
    'button.secondaryBackground': c('bg-button-inactive'),
    'button.secondaryForeground': c('fg-main'),
    'button.secondaryHoverBackground': c('bg-hover'),
    'badge.background': c('bg-active'),
    'badge.foreground': c('fg-main'),
    'progressBar.background': c('accent-0'),

    // Scroll bars (scroll-bar uses `border' for the thumb)
    'scrollbarSlider.background': t('border'),
    'scrollbarSlider.hoverBackground': t('fg-dim'),
    'scrollbarSlider.activeBackground': t('fg-alt'),

    // Editor groups and tabs (tab-bar)
    'editorGroup.border': c('border'),
    'editorGroup.dropBackground': t('bg-hover-secondary'),
    'editorGroupHeader.tabsBackground': c('bg-tab-bar'),
    'editorGroupHeader.noTabsBackground': c('bg-tab-bar'),
    'tab.activeBackground': c('bg-tab-current'),
    'tab.activeForeground': c('fg-main'),
    'tab.inactiveBackground': c('bg-tab-other'),
    'tab.inactiveForeground': c('fg-main'),
    'tab.unfocusedActiveBackground': c('bg-tab-current'),
    'tab.unfocusedActiveForeground': c('fg-main'),
    'tab.unfocusedInactiveBackground': c('bg-tab-other'),
    'tab.unfocusedInactiveForeground': c('fg-main'),
    'tab.border': c('bg-tab-bar'),
    'tab.hoverBackground': c('bg-hover'),
    'tab.hoverForeground': c('fg-main'),
    'tab.unfocusedHoverBackground': c('bg-hover'),
    'tab.unfocusedHoverForeground': c('fg-main'),
    'tab.activeModifiedBorder': c('warning'), // tab-line-tab-modified
    'tab.inactiveModifiedBorder': c('warning'),
    'tab.unfocusedActiveModifiedBorder': c('warning'),
    'tab.unfocusedInactiveModifiedBorder': c('warning'),
    'tab.lastPinnedBorder': c('border'),
    'sideBySideEditor.horizontalBorder': c('border'),
    'sideBySideEditor.verticalBorder': c('border'),
    'breadcrumb.background': c('bg-main'),
    'breadcrumb.foreground': c('fg-alt'), // breadcrumb-face
    'breadcrumb.focusForeground': c('fg-main'),
    'breadcrumb.activeSelectionForeground': c('fg-main'),
    'breadcrumbPicker.background': c('bg-popup'),

    // Editor
    'editor.background': c('bg-main'),
    'editor.foreground': c('fg-main'),
    'editorCursor.foreground': c('cursor'),
    'editorCursor.background': c('bg-main'),
    'editor.selectionBackground': c('bg-region'),
    'editor.lineHighlightBackground': c('bg-hl-line'),
    'editor.lineHighlightBorder': NONE,
    'editor.findMatchBackground': c('bg-search-current'), // isearch
    'editor.findMatchForeground': c('fg-search-current'),
    'editor.findMatchHighlightBackground': t('bg-search-lazy'), // lazy-highlight
    'editor.findMatchHighlightForeground': c('fg-search-lazy'),
    'editor.findRangeHighlightBackground': t('bg-dim'),
    'editor.hoverHighlightBackground': t('bg-hover'), // highlight
    'editor.rangeHighlightBackground': t('bg-hl-line'),
    // eglot-highlight-symbol-face: no background, `border' underline
    'editor.wordHighlightBackground': NONE,
    'editor.wordHighlightBorder': c('border'),
    'editor.wordHighlightStrongBackground': NONE,
    'editor.wordHighlightStrongBorder': c('border'),
    'editor.wordHighlightTextBackground': NONE,
    'editor.wordHighlightTextBorder': c('border'),
    'editorLink.activeForeground': c('fg-link'),
    'editorBracketMatch.background': c('bg-paren-match'), // show-paren-match
    'editorBracketMatch.foreground': c('fg-paren-match'),
    'editorBracketMatch.border': NONE, // underline-paren-match is unspecified
    // rainbow-delimiters
    'editorBracketHighlight.foreground1': c('rainbow-0'),
    'editorBracketHighlight.foreground2': c('rainbow-1'),
    'editorBracketHighlight.foreground3': c('rainbow-2'),
    'editorBracketHighlight.foreground4': c('rainbow-3'),
    'editorBracketHighlight.foreground5': c('rainbow-4'),
    'editorBracketHighlight.foreground6': c('rainbow-5'),
    'editorBracketHighlight.unexpectedBracket.foreground': c('err'),
    'editorIndentGuide.background1': c('fg-space'),
    'editorIndentGuide.activeBackground1': c('fg-dim'),
    'editorRuler.foreground': c('bg-active'), // fill-column-indicator
    'editorWhitespace.foreground': c('fg-space'),
    'editorLineNumber.foreground': c('fg-line-number-inactive'),
    'editorLineNumber.activeForeground': c('fg-line-number-active'),
    'editorLineNumber.dimmedForeground': c('fg-dim'),
    'editorGutter.background': c.or('fringe', 'bg-main'),
    'editorGutter.addedBackground': c('bg-added-fringe'), // diff-hl
    'editorGutter.modifiedBackground': c('bg-changed-fringe'),
    'editorGutter.deletedBackground': c('bg-removed-fringe'),
    'editorGutter.foldingControlForeground': c('fg-dim'),
    'editorCodeLens.foreground': c('fg-dim'),
    'editorInlayHint.foreground': c('fg-dim'), // eglot-inlay-hint-face
    'editorInlayHint.background': NONE,
    'editorGhostText.foreground': c('fg-dim'), // completion-preview
    'editor.placeholder.foreground': c('fg-dim'),
    'editorError.foreground': c('underline-err'),
    'editorWarning.foreground': c('underline-warning'),
    'editorInfo.foreground': c('underline-note'),
    'editorHint.foreground': c('underline-note'),
    'editorUnicodeHighlight.border': c('underline-warning'),
    'editorLightBulb.foreground': c('warning'),
    'editorLightBulbAutoFix.foreground': c('info'),
    'editorOverviewRuler.border': c('border'),
    'editorOverviewRuler.errorForeground': c('err'),
    'editorOverviewRuler.warningForeground': c('warning'),
    'editorOverviewRuler.infoForeground': c('info'),
    'editorOverviewRuler.findMatchForeground': t('bg-search-lazy'),
    'editorStickyScroll.background': c('bg-dim'), // header-line
    'editorStickyScrollHover.background': c('bg-hover'),
    'minimap.selectionHighlight': c('bg-region'),
    'minimap.findMatchHighlight': c('bg-search-lazy'),
    'minimap.errorHighlight': c('err'),
    'minimap.warningHighlight': c('warning'),

    // Floating widgets: corfu for completion, eldoc-box for hovers
    'editorWidget.background': c('bg-popup'),
    'editorWidget.foreground': c('fg-main'),
    'editorWidget.border': c('border'),
    'editorSuggestWidget.background': c('bg-popup'),
    'editorSuggestWidget.foreground': c('fg-main'),
    'editorSuggestWidget.border': c('bg-active'),
    'editorSuggestWidget.selectedBackground': c('bg-completion'),
    'editorSuggestWidget.selectedForeground': c('fg-main'),
    'editorSuggestWidget.selectedIconForeground': c('fg-main'),
    'editorSuggestWidget.highlightForeground': c('fg-completion-match-0'),
    'editorSuggestWidget.focusHighlightForeground': c('fg-completion-match-0'),
    'editorSuggestWidgetStatus.foreground': c('fg-dim'),
    'editorHoverWidget.background': c('bg-dim'),
    'editorHoverWidget.foreground': c('fg-main'),
    'editorHoverWidget.border': c('border'),
    'editorHoverWidget.highlightForeground': c('fg-active-argument'), // eldoc-highlight-function-argument
    'editorHoverWidget.statusBarBackground': c('bg-alt'),
    'debugToolBar.background': c('bg-popup'),
    'debugToolBar.border': c('border'),

    // Peek views (xref)
    'peekView.border': c('border'),
    'peekViewTitle.background': c('bg-alt'),
    'peekViewTitleLabel.foreground': c('fg-main'),
    'peekViewTitleDescription.foreground': c('fg-dim'),
    'peekViewEditor.background': c('bg-dim'),
    'peekViewEditorGutter.background': c('bg-dim'),
    'peekViewEditor.matchHighlightBackground': t('bg-search-static', 'bg-dim'),
    'peekViewResult.background': c('bg-dim'),
    'peekViewResult.fileForeground': c('name'),
    'peekViewResult.lineForeground': c('fg-main'),
    'peekViewResult.selectionBackground': c('bg-completion'),
    'peekViewResult.selectionForeground': c('fg-main'),
    'peekViewResult.matchHighlightBackground': t('bg-search-static', 'bg-dim'),

    // Diffs (diff-mode, ediff) and merge conflicts (smerge)
    'diffEditor.insertedLineBackground': t('bg-added'),
    'diffEditor.insertedTextBackground': over(c('bg-added-refine'), c('bg-added')),
    'diffEditor.removedLineBackground': t('bg-removed'),
    'diffEditor.removedTextBackground': over(c('bg-removed-refine'), c('bg-removed')),
    'diffEditor.border': c('border'),
    'diffEditor.diagonalFill': c('border'),
    'diffEditor.unchangedRegionBackground': c('bg-diff-context'),
    'diffEditor.unchangedRegionForeground': c('fg-dim'),
    'merge.currentHeaderBackground': t('bg-removed-refine'), // smerge-upper
    'merge.currentContentBackground': t('bg-removed'),
    'merge.incomingHeaderBackground': t('bg-added-refine'), // smerge-lower
    'merge.incomingContentBackground': t('bg-added'),
    'merge.commonHeaderBackground': t('bg-changed-refine'), // smerge-base
    'merge.commonContentBackground': t('bg-changed'),

    // Panel and terminal
    'panel.background': c('bg-main'),
    'panel.border': c('border'),
    'panelTitle.activeForeground': c('fg-main'),
    'panelTitle.inactiveForeground': c('fg-dim'),
    'panelTitle.activeBorder': c('accent-0'),
    'panelSection.border': c('border'),
    'panelInput.border': c('border'),
    'terminal.background': c('bg-main'),
    'terminal.foreground': c('fg-main'),
    'terminal.border': c('border'),
    'terminalCursor.foreground': c('cursor'),
    'terminalCursor.background': c('bg-main'),
    'terminal.selectionBackground': c('bg-region'),
    'terminal.findMatchBackground': t('bg-search-current'),
    'terminal.findMatchHighlightBackground': t('bg-search-lazy'),
    'terminal.hoverHighlightBackground': t('bg-hover'),

    // Status bar (mode-line)
    'statusBar.background': c('bg-mode-line-active'),
    'statusBar.foreground': c('fg-mode-line-active'),
    'statusBar.border': c('border-mode-line-active'),
    'statusBar.focusBorder': c('fg-mode-line-active'),
    'statusBar.noFolderBackground': c('bg-mode-line-active'),
    'statusBar.noFolderForeground': c('fg-mode-line-active'),
    'statusBar.noFolderBorder': c('border-mode-line-active'),
    'statusBar.debuggingBackground': c('bg-prominent-warning'),
    'statusBar.debuggingForeground': c('fg-prominent-warning'),
    'statusBar.debuggingBorder': c('border-mode-line-active'),
    'statusBarItem.hoverBackground': c('bg-hover'), // mode-line-highlight
    'statusBarItem.hoverForeground': c('fg-main'),
    'statusBarItem.activeBackground': c('bg-active'),
    'statusBarItem.focusBorder': c('fg-mode-line-active'),
    'statusBarItem.remoteBackground': c('bg-mode-line-active'),
    'statusBarItem.remoteForeground': c('fg-mode-line-active'),
    'statusBarItem.remoteHoverBackground': c('bg-hover'),
    'statusBarItem.remoteHoverForeground': c('fg-main'),
    'statusBarItem.errorBackground': c('bg-prominent-err'),
    'statusBarItem.errorForeground': c('fg-prominent-err'),
    'statusBarItem.errorHoverBackground': c('bg-hover'),
    'statusBarItem.errorHoverForeground': c('fg-main'),
    'statusBarItem.warningBackground': c('bg-prominent-warning'),
    'statusBarItem.warningForeground': c('fg-prominent-warning'),
    'statusBarItem.warningHoverBackground': c('bg-hover'),
    'statusBarItem.warningHoverForeground': c('fg-main'),
    'statusBarItem.prominentBackground': c('bg-active'),
    'statusBarItem.prominentForeground': c('fg-main'),
    'statusBarItem.prominentHoverBackground': c('bg-hover'),
    'statusBarItem.prominentHoverForeground': c('fg-main'),

    // Notifications
    'notifications.background': c('bg-popup'),
    'notifications.foreground': c('fg-main'),
    'notifications.border': c('border'),
    'notificationCenter.border': c('border'),
    'notificationCenterHeader.background': c('bg-alt'),
    'notificationCenterHeader.foreground': c('fg-main'),
    'notificationToast.border': c('border'),
    'notificationLink.foreground': c('fg-link'),
    'notificationsErrorIcon.foreground': c('err'),
    'notificationsWarningIcon.foreground': c('warning'),
    'notificationsInfoIcon.foreground': c('info'),

    // Source control
    'gitDecoration.addedResourceForeground': c('fg-added'),
    'gitDecoration.untrackedResourceForeground': c('fg-added'),
    'gitDecoration.modifiedResourceForeground': c('fg-changed'),
    'gitDecoration.renamedResourceForeground': c('fg-changed'),
    'gitDecoration.stageModifiedResourceForeground': c('fg-changed'),
    'gitDecoration.deletedResourceForeground': c('fg-removed'),
    'gitDecoration.stageDeletedResourceForeground': c('fg-removed'),
    'gitDecoration.conflictingResourceForeground': c('err'),
    'gitDecoration.ignoredResourceForeground': c('fg-dim'),
    'gitDecoration.submoduleResourceForeground': c('fg-alt'),

    // Debugging and testing
    'editor.stackFrameHighlightBackground': t('bg-prominent-warning'),
    'editor.focusedStackFrameHighlightBackground': t('bg-prominent-note'),
    'debugIcon.breakpointForeground': c('err'),
    'debugIcon.breakpointDisabledForeground': c('fg-dim'),
    'debugIcon.breakpointUnverifiedForeground': c('fg-dim'),
    'debugIcon.breakpointCurrentStackframeForeground': c('warning'),
    'debugIcon.breakpointStackframeForeground': c('info'),
    'debugIcon.startForeground': c('info'),
    'debugIcon.continueForeground': c('info'),
    'debugIcon.restartForeground': c('info'),
    'debugIcon.pauseForeground': c('warning'),
    'debugIcon.stopForeground': c('err'),
    'debugIcon.disconnectForeground': c('err'),
    'debugIcon.stepOverForeground': c('fg-alt'),
    'debugIcon.stepIntoForeground': c('fg-alt'),
    'debugIcon.stepOutForeground': c('fg-alt'),
    'debugIcon.stepBackForeground': c('fg-alt'),
    'debugConsole.infoForeground': c('info'),
    'debugConsole.warningForeground': c('warning'),
    'debugConsole.errorForeground': c('err'),
    'debugConsole.sourceForeground': c('fg-main'),
    'debugConsoleInputIcon.foreground': c('fg-prompt'),
    'debugTokenExpression.name': c('variable'),
    'debugTokenExpression.type': c('type'),
    'debugTokenExpression.value': c('fg-main'),
    'debugTokenExpression.string': c('string'),
    'debugTokenExpression.boolean': c('constant'),
    'debugTokenExpression.number': c('number'),
    'debugTokenExpression.error': c('err'),
    'testing.iconPassed': c('info'),
    'testing.iconFailed': c('err'),
    'testing.iconErrored': c('err'),
    'testing.iconQueued': c('warning'),
    'testing.iconUnset': c('fg-dim'),
    'testing.iconSkipped': c('fg-dim'),
    'testing.runAction': c('info'),

    // Settings, welcome page, charts
    'settings.headerForeground': c('fg-main'),
    'settings.modifiedItemIndicator': c('warning'),
    'welcomePage.tileBackground': c('bg-dim'),
    'welcomePage.tileHoverBackground': c('bg-hover'),
    'welcomePage.tileBorder': c('border'),
    'walkThrough.embeddedEditorBackground': c('bg-dim'),
    'charts.foreground': c('fg-main'),
    'charts.lines': c('fg-dim'),
    'charts.red': c('red'),
    'charts.blue': c('blue'),
    'charts.yellow': c('yellow'),
    'charts.orange': c('yellow-warmer'),
    'charts.green': c('green'),
    'charts.purple': c('magenta-cooler'),

    // Symbol icons in outlines and completion, by syntax role
    'symbolIcon.arrayForeground': c('fg-main'),
    'symbolIcon.booleanForeground': c('constant'),
    'symbolIcon.classForeground': c('type'),
    'symbolIcon.colorForeground': c('fg-main'),
    'symbolIcon.constantForeground': c('constant'),
    'symbolIcon.constructorForeground': c('fnname'),
    'symbolIcon.enumeratorForeground': c('type'),
    'symbolIcon.enumeratorMemberForeground': c('constant'),
    'symbolIcon.eventForeground': c('fnname'),
    'symbolIcon.fieldForeground': c('property'),
    'symbolIcon.fileForeground': c('fg-main'),
    'symbolIcon.folderForeground': c('fg-main'),
    'symbolIcon.functionForeground': c('fnname'),
    'symbolIcon.interfaceForeground': c('type'),
    'symbolIcon.keyForeground': c('property'),
    'symbolIcon.keywordForeground': c('keyword'),
    'symbolIcon.methodForeground': c('fnname'),
    'symbolIcon.moduleForeground': c('constant'),
    'symbolIcon.namespaceForeground': c('constant'),
    'symbolIcon.nullForeground': c('constant'),
    'symbolIcon.numberForeground': c('number'),
    'symbolIcon.objectForeground': c('fg-main'),
    'symbolIcon.operatorForeground': c('operator'),
    'symbolIcon.packageForeground': c('constant'),
    'symbolIcon.propertyForeground': c('property'),
    'symbolIcon.referenceForeground': c('fg-main'),
    'symbolIcon.snippetForeground': c('fg-main'),
    'symbolIcon.stringForeground': c('string'),
    'symbolIcon.structForeground': c('type'),
    'symbolIcon.textForeground': c('fg-main'),
    'symbolIcon.typeParameterForeground': c('type'),
    'symbolIcon.unitForeground': c('fg-main'),
    'symbolIcon.variableForeground': c('variable'),
  };

  // Terminal colors, as ansi-color uses them.
  for (const [vscode, ef] of [
    ['Black', 'black'], ['Red', 'red'], ['Green', 'green'], ['Yellow', 'yellow'],
    ['Blue', 'blue'], ['Magenta', 'magenta'], ['Cyan', 'cyan'], ['White', 'white'],
  ]) {
    colors[`terminal.ansi${vscode}`] = c(`fg-term-${ef}`);
    colors[`terminal.ansiBright${vscode}`] = c(`fg-term-${ef}-bright`);
  }

  return colors;
}

// ---------------------------------------------------------------------------
// Syntax: TextMate scopes, mapped to the palette entries that the
// matching Emacs faces use (font-lock-*-face and the tree-sitter
// modes' choices). Each rule is [palette key or null, scopes, fontStyle].

const md = (s) => `text.html.markdown ${s}`;

// Doc comments take the docstring color as a whole, delimiters included.
const DOC_COMMENTS = [
  'comment.block.documentation', 'comment.line.documentation', 'comment.documentation',
  'comment.block.javadoc', 'comment.line.double-slash.documentation', 'comment.line.triple-slash',
];

// Languages whose variables carry a sigil ($x, @x): Emacs colours every
// occurrence with font-lock-variable-name-face.
const SIGIL_VARIABLES = [
  'source.shell', 'source.css', 'source.css.scss', 'source.css.less', 'source.php',
  'source.perl', 'source.makefile', 'source.powershell', 'source.ruby',
].flatMap((lang) => ['variable', 'variable.other', 'variable.other.readwrite'].map((v) => `${lang} ${v}`));

const TOKENS = [
  // Plain text inside embedded code and template interpolations.
  ['fg-main', [
    'meta.embedded', 'meta.template.expression',
    'string.unquoted.argument.shell', 'constant.other.option',
  ]],

  // Comments and documentation.
  ['comment', ['comment', 'punctuation.definition.comment']],
  ['docstring', [
    ...DOC_COMMENTS,
    ...DOC_COMMENTS.flatMap((d) => [
      'punctuation', 'punctuation.definition', 'punctuation.definition.comment',
      'variable', 'variable.other', 'variable.parameter', 'entity.name.type',
    ].map((s) => `${d} ${s}`)),
    'string.quoted.docstring', 'string.quoted.docstring punctuation.definition.string',
    'entity.name.type.instance.jsdoc', 'variable.other.jsdoc',
  ]],
  ['docmarkup', [
    'keyword.other.documentation', 'storage.type.class.jsdoc', 'storage.type.class.javadoc',
    'punctuation.definition.block.tag.jsdoc', 'punctuation.definition.inline.tag.jsdoc',
    'comment.block.documentation keyword', 'comment.block.documentation storage.type',
    'comment.block.javadoc keyword',
  ]],

  // Strings, escapes and regular expressions.
  ['string', [
    'string', 'punctuation.definition.string', 'string.regexp', 'constant.other.placeholder',
    'storage.type.string.python', 'storage.type.format.python', 'string.regexp keyword.other',
    'constant.other.character-class.set.regexp', 'constant.other.character-class.range.regexp',
  ]],
  ['rx-backslash', [
    'constant.character.escape', 'constant.character.escape.backslash.regexp',
    'constant.other.character-class.regexp', 'constant.character.character-class.regexp',
    'constant.other.backreference.regexp', 'keyword.other.back-reference.regexp',
  ]],
  ['rx-construct', [
    'punctuation.definition.group.regexp', 'punctuation.definition.group.assertion.regexp',
    'punctuation.definition.group.no-capture.regexp', 'punctuation.definition.character-class.regexp',
    'punctuation.character.set.begin.regexp', 'punctuation.character.set.end.regexp',
    'keyword.operator.or.regexp', 'keyword.operator.quantifier.regexp', 'keyword.control.anchor.regexp',
    'keyword.operator.negation.regexp', 'support.other.parenthesis.regexp',
    'meta.assertion.look-ahead.regexp punctuation', 'meta.assertion.look-behind.regexp punctuation',
  ]],

  // Keywords and operators.
  ['keyword', [
    'keyword', 'keyword.control', 'keyword.other', 'storage', 'storage.type', 'storage.modifier',
    'keyword.operator.new', 'keyword.operator.expression', 'keyword.operator.delete',
    'keyword.operator.sizeof', 'keyword.operator.alignof', 'keyword.operator.typeid',
    'keyword.operator.logical.python', 'keyword.operator.word', 'keyword.operator.wordlike',
    'keyword.operator.cast', 'variable.language', 'punctuation.definition.keyword',
    'variable.parameter.function.language.special.self', 'support.type.property-name.media',
    'support.type.property-name.css', 'support.type.property-name.scss', 'support.type.property-name.less',
    'support.type.vendored.property-name.css',
  ]],
  ['operator', ['keyword.operator', 'storage.type.function.arrow', 'punctuation.separator.key-value']],
  ['punctuation', [
    'punctuation', 'meta.brace', 'punctuation.section', 'punctuation.separator', 'punctuation.terminator',
    'constant.character.format.placeholder.other.python',
  ]],
  ['preprocessor', [
    'keyword.control.directive', 'punctuation.definition.directive',
    'keyword.preprocessor', 'meta.attribute.rust', 'punctuation.definition.attribute.rust',
    'entity.name.function.macro.rust', 'support.macro.rust',
  ]],

  // Constants and numbers.
  ['constant', [
    'constant', 'constant.language', 'constant.other', 'constant.character', 'constant.character.entity',
    'support.constant', 'variable.other.constant', 'variable.other.enummember', 'constant.other.symbol',
    'entity.name.label', 'entity.name.namespace', 'entity.name.module', 'entity.name.type.namespace',
    'entity.name.type.module', 'entity.name.scope-resolution', 'support.other.namespace',
    'support.variable', 'support.class.console',
    'storage.type.annotation.java', 'punctuation.definition.annotation.java',
    'storage.modifier.package.java', 'storage.modifier.import.java',
    'punctuation.definition.constant', 'punctuation.definition.entity.html',
    'entity.other.attribute-name.tsx', 'entity.other.attribute-name.js', 'entity.other.attribute-name.jsx',
  ]],
  ['number', ['constant.numeric', 'keyword.other.unit', 'storage.type.number.python']],

  // Functions.
  ['fnname', [
    'entity.name.function', 'entity.name.function.preprocessor', 'entity.name.function support.function',
    'meta.definition.method entity.name.function', 'meta.definition.function entity.name.function',
    'entity.name.tag', 'meta.selector entity.other.attribute-name', 'entity.other.attribute-name.class.css',
    'entity.other.attribute-name.id.css', 'entity.other.attribute-name.pseudo-class.css',
    'entity.other.attribute-name.pseudo-element.css', 'punctuation.definition.entity.css',
    'meta.function support.function.magic',
  ]],
  ['fnname-call', [
    'meta.function-call entity.name.function', 'meta.function.call entity.name.function',
    'meta.method-call entity.name.function', 'meta.method.call entity.name.function',
    'meta.function-call.generic', 'entity.name.function.call', 'entity.name.function.member',
    'entity.name.function.support', 'variable.function', 'support.function', 'entity.name.command',
    'entity.name.tag.tsx', 'entity.name.tag.js', 'entity.name.tag.jsx',
    'support.class.component.tsx', 'support.class.component.js', 'support.class.component.jsx',
  ]],
  ['builtin', [
    'support.function.builtin', 'support.type.python', 'support.variable.magic.python',
    'entity.name.function.support.builtin', 'entity.name.tag.namespace', 'keyword.control.at-rule', 'keyword.control.at-rule punctuation.definition.keyword',
    'keyword.other.important',
  ]],

  // Types.
  ['type', [
    'entity.name.type', 'entity.name.class', 'entity.name.struct', 'entity.name.enum', 'entity.name.union',
    'entity.name.trait', 'entity.name.interface', 'entity.other.inherited-class', 'support.type',
    'support.class', 'storage.type.primitive', 'storage.type.built-in', 'storage.type.numeric',
    'storage.type.string.go', 'storage.type.boolean.go', 'storage.type.byte.go', 'storage.type.rune.go',
    'storage.type.error.go', 'storage.type.uintptr.go', 'storage.type.java', 'storage.type.generic',
    'storage.type.object', 'source.cs keyword.type', 'support.type.exception.python',
    'entity.other.attribute-name.namespace',
    'meta.function.decorator.python', 'entity.name.function.decorator.python',
    'punctuation.definition.decorator.python', 'entity.name.section.group-title',
    'entity.name.type.anchor.yaml', 'punctuation.definition.anchor.yaml',
    'variable.other.anchor.yaml', 'punctuation.definition.alias.yaml', 'variable.other.alias.yaml',
    'storage.type.tag-handle.yaml',
    'support.type.property-name.table.toml', 'meta.tag.table.toml', 'meta.tag.table.array.toml',
  ]],

  // Variables and properties: definitions get `variable', uses get
  // `variable-use'. Languages with sigils colour every variable.
  ['variable-use', ['variable', 'variable.other', 'variable.other.readwrite', 'variable.other.object']],
  ['variable', [
    'variable.parameter', 'entity.name.variable', 'meta.definition.variable variable.other',
    'meta.definition.variable variable.other.readwrite', 'meta.definition.variable variable.other.constant',
    'meta.definition.variable entity.name', 'variable.other.definition', 'entity.other.attribute-name',
    'keyword.other.definition.ini', 'punctuation.definition.variable', 'source.shell variable.language',
    ...SIGIL_VARIABLES,
  ]],
  ['property', [
    'variable.other.property', 'variable.other.object.property', 'variable.object.property',
    'variable.other.member', 'support.variable.property', 'meta.object-literal.key',
    'entity.name.property', 'support.type.property-name', 'support.type.property-name.json',
    'support.type.property-name.toml', 'punctuation.support.type.property-name', 'entity.name.tag.yaml',
  ]],

  // Markup (markdown-mode).
  ['fg-heading-1', ['markup.heading', 'heading.1.markdown', 'markup.heading.setext.1'], 'bold'],
  ['fg-heading-2', ['heading.2.markdown', 'markup.heading.setext.2'], 'bold'],
  ['fg-heading-3', ['heading.3.markdown'], 'bold'],
  ['fg-heading-4', ['heading.4.markdown'], 'bold'],
  ['fg-heading-5', ['heading.5.markdown'], 'bold'],
  ['fg-heading-6', ['heading.6.markdown'], 'bold'],
  [null, ['markup.bold'], 'bold'],
  [null, ['markup.italic'], 'italic'],
  [null, ['markup.bold markup.italic', 'markup.italic markup.bold'], 'bold italic'],
  [null, ['markup.strikethrough'], 'strikethrough'],
  [null, ['markup.underline'], 'underline'],
  // markdown-markup-face: markers are dim and take no bold or italic.
  ['fg-dim', [md('punctuation.definition'), md('punctuation.definition.list.begin')], ''],
  ['fg-dim', ['punctuation.definition.tag']],
  ['fg-prose-code', ['markup.inline.raw']],
  ['fg-prose-block-delimiter', ['fenced_code.block.language', 'fenced_code.block.language.markdown']],
  ['docstring', ['markup.quote']],
  ['fg-link', ['string.other.link', 'constant.other.reference.link'], 'underline'],
  ['fg-link', ['markup.underline.link', 'markup.underline.link.image'], ''],
  ['comment', ['string.other.link.description.title'], ''], // markdown-link-title-face
  ['comment', ['string.other.link.description.title punctuation.definition.string']],
  ['prose-table', ['markup.table']],
  ['type', ['markup.math']],
  ['fg-added', ['markup.inserted', 'markup.inserted punctuation.definition']],
  ['fg-removed', ['markup.deleted', 'markup.deleted punctuation.definition']],
  ['fg-changed', ['markup.changed', 'markup.changed punctuation.definition']],

  // Errors.
  ['err', ['invalid', 'invalid.illegal']],
  ['warning', ['invalid.deprecated']],
];

function tokenColors(c) {
  return TOKENS.map(([key, scope, fontStyle]) => {
    const settings = {};
    if (key) settings.foreground = c(key);
    if (fontStyle !== undefined) settings.fontStyle = fontStyle;
    return { scope, settings };
  });
}

// Semantic tokens from language servers. Declarations and uses differ
// the way they do in Emacs (fnname vs fnname-call, variable vs
// variable-use).
function semanticTokenColors(c) {
  return {
    namespace: c('constant'),
    type: c('type'),
    class: c('type'),
    struct: c('type'),
    interface: c('type'),
    enum: c('type'),
    typeParameter: c('type'),
    enumMember: c('constant'),
    function: c('fnname-call'),
    'function.declaration': c('fnname'),
    'function.defaultLibrary': c('builtin'),
    method: c('fnname-call'),
    'method.declaration': c('fnname'),
    macro: c('preprocessor'),
    'macro.defaultLibrary': c('builtin'),
    decorator: c('fnname-call'),
    'decorator:python': c('type'),
    variable: c('variable-use'),
    'variable.readonly': c('variable-use'),
    'variable.declaration': c('variable'),
    'variable.declaration.readonly': c('variable'),
    'variable.defaultLibrary': c('constant'),
    parameter: c('variable-use'),
    'parameter.declaration': c('variable'),
    property: c('property'),
    'property.readonly': c('property'),
    selfParameter: c('keyword'),
    selfKeyword: c('keyword'),
    label: c('constant'),
  };
}

// ---------------------------------------------------------------------------
// Output

export { themes, accessor, workbench, tokenColors, semanticTokenColors };

const label = (name) =>
  name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

function main() {
  const themesDir = join(root, 'themes');
  mkdirSync(themesDir, { recursive: true });
  for (const f of readdirSync(themesDir)) {
    if (f.endsWith('-color-theme.json')) unlinkSync(join(themesDir, f));
  }

  const contributions = [];
  for (const name of Object.keys(themes).sort()) {
    const { kind } = themes[name];
    const c = accessor(name);
    const file = `${name}-color-theme.json`;
    const theme = {
      $schema: 'vscode://schemas/color-theme',
      name: label(name),
      type: kind,
      semanticHighlighting: true,
      colors: workbench(c),
      tokenColors: tokenColors(c),
      semanticTokenColors: semanticTokenColors(c),
    };
    writeFileSync(join(themesDir, file), JSON.stringify(theme, null, 2) + '\n');
    contributions.push({
      label: label(name),
      uiTheme: kind === 'dark' ? 'vs-dark' : 'vs',
      path: `./themes/${file}`,
    });
  }

  const pkgPath = join(root, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.contributes = { ...pkg.contributes, themes: contributions };
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

  console.log(
    `Built ${contributions.length} themes from ef-themes ${source['ef-themes']} ` +
      `(modus-themes ${source['modus-themes']}).`,
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
