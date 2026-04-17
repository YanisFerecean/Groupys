"use client";

import { useCallback, useMemo, useState, type JSX, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import { INSERT_ORDERED_LIST_COMMAND } from "@lexical/list";
import { $createHeadingNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  TextNode,
  type LexicalEditor,
} from "lexical";

class SlashCommandOption extends MenuOption {
  label: string;
  iconNode: ReactNode;
  keywords: string[];
  onSelect: () => void;

  constructor(
    label: string,
    options: {
      icon: ReactNode;
      keywords?: string[];
      onSelect: () => void;
    },
  ) {
    super(label);
    this.label = label;
    this.iconNode = options.icon;
    this.keywords = options.keywords ?? [];
    this.onSelect = options.onSelect.bind(this);
  }
}

function CommandIcon({ children, fontSize = 12 }: { children: ReactNode; fontSize?: number }): JSX.Element {
  return (
    <span
      className="w-7 h-7 shrink-0 flex items-center justify-center rounded-md bg-surface-container-high text-on-surface-variant font-semibold"
      style={{ fontSize }}
    >
      {children}
    </span>
  );
}

function getSlashCommands(editor: LexicalEditor): SlashCommandOption[] {
  return [
    new SlashCommandOption("Text", {
      icon: <CommandIcon>T</CommandIcon>,
      keywords: ["text", "paragraph", "p"],
      onSelect: () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createParagraphNode());
          }
        });
      },
    }),
    new SlashCommandOption("Heading 1", {
      icon: <CommandIcon fontSize={10}>H1</CommandIcon>,
      keywords: ["heading", "header", "h1", "title"],
      onSelect: () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode("h1"));
          }
        });
      },
    }),
    new SlashCommandOption("Heading 2", {
      icon: <CommandIcon fontSize={10}>H2</CommandIcon>,
      keywords: ["heading", "header", "h2", "subtitle"],
      onSelect: () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode("h2"));
          }
        });
      },
    }),
    new SlashCommandOption("Heading 3", {
      icon: <CommandIcon fontSize={10}>H3</CommandIcon>,
      keywords: ["heading", "header", "h3"],
      onSelect: () => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            $setBlocksType(selection, () => $createHeadingNode("h3"));
          }
        });
      },
    }),
    new SlashCommandOption("Numbered List", {
      icon: <CommandIcon fontSize={10}>1.</CommandIcon>,
      keywords: ["numbered", "list", "ol", "ordered"],
      onSelect: () => {
        editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
      },
    }),
  ];
}

function SlashCommandMenuItem({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: SlashCommandOption;
}): ReactElement {
  return (
    <li
      key={option.key}
      tabIndex={-1}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={`slash-command-${index}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-pointer text-sm text-on-surface transition-colors ${
        isSelected ? "bg-surface-container-high" : "hover:bg-surface-container-high/60"
      }`}
    >
      {option.iconNode}
      <span>{option.label}</span>
    </li>
  );
}

export default function SlashCommandPlugin(): ReactElement | null {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);

  const checkForTriggerMatch = useBasicTypeaheadTriggerMatch("/", {
    minLength: 0,
  });

  const options = useMemo(() => {
    const commands = getSlashCommands(editor);
    if (!queryString) return commands;
    const safe = queryString.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(safe, "i");
    return commands.filter(
      (option) => regex.test(option.label) || option.keywords.some((k) => regex.test(k)),
    );
  }, [editor, queryString]);

  const onSelectOption = useCallback(
    (
      selectedOption: SlashCommandOption,
      nodeToRemove: TextNode | null,
      closeMenu: () => void,
    ) => {
      editor.update(() => {
        nodeToRemove?.remove();
        selectedOption.onSelect();
        closeMenu();
      });
    },
    [editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin<SlashCommandOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForTriggerMatch}
      options={options}
      menuRenderFn={(anchorElementRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) => {
        if (anchorElementRef.current == null || options.length === 0) return null;
        const rect = anchorElementRef.current.getBoundingClientRect();
        return createPortal(
          <div
            className="fixed z-[1000] min-w-[220px] max-h-[320px] overflow-auto p-1 bg-surface-container-lowest border border-white/80 rounded-lg shadow-lg"
            style={{ left: rect.left, top: rect.bottom + 8 }}
          >
            <ul className="list-none m-0 p-0">
              {options.map((option, index) => (
                <SlashCommandMenuItem
                  key={option.key}
                  index={index}
                  isSelected={selectedIndex === index}
                  onClick={() => {
                    setHighlightedIndex(index);
                    selectOptionAndCleanUp(option);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  option={option}
                />
              ))}
            </ul>
          </div>,
          document.body,
        );
      }}
    />
  );
}
